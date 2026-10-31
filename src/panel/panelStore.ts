import { create } from 'zustand';
import type { ActiveTabInfo, InspectSummary } from '../shared/messaging/protocol';
import type { AuditSession } from '../shared/domain/auditSession';
import type { Route } from '../shared/domain/route';
import type { Settings } from '../shared/config/settings';
import type { RpcError } from '../shared/messaging/rpc';
import {
  getActiveTabInfo as fetchActiveTabInfo,
  getSettings as fetchSettings,
  getSession,
  inspectPage,
  listRoutes,
  resetSettings as sendResetSettings,
  saveSettings as sendSaveSettings,
  startAudit as sendStartAudit,
  stopAudit as sendStopAudit,
} from './messaging/client';
import { grantOriginPermission } from './permissions/originPermissions';

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface PanelState {
  connection: ConnectionState;
  tabInfo: ActiveTabInfo | null;
  inspectResult: InspectSummary | null;
  inspectBusy: boolean;
  settings: Settings | null;
  settingsStatus: 'idle' | 'saving' | 'saved' | 'error' | 'reset';
  error: RpcError | null;
  session: AuditSession | null;
  routes: Route[];
  auditBusy: boolean;
  initialize: () => Promise<void>;
  refreshTab: () => Promise<void>;
  grantOrigin: () => Promise<void>;
  inspect: () => Promise<void>;
  updateSettings: (next: Settings) => Promise<void>;
  resetSettings: () => Promise<void>;
  startAudit: () => Promise<void>;
  stopAudit: () => Promise<void>;
  refreshRoutes: () => Promise<void>;
}

export const usePanelStore = create<PanelState>((set) => ({
  connection: 'connecting',
  tabInfo: null,
  inspectResult: null,
  inspectBusy: false,
  settings: null,
  settingsStatus: 'idle',
  error: null,
  session: null,
  routes: [],
  auditBusy: false,

  initialize: async () => {
    try {
      const [tabInfo, settings] = await Promise.all([fetchActiveTabInfo(), fetchSettings()]);
      set({ connection: 'connected', tabInfo, settings });
    } catch {
      set({ connection: 'disconnected' });
    }
  },

  refreshTab: async () => {
    const tabInfo = await fetchActiveTabInfo();
    set({ tabInfo });
  },

  grantOrigin: async () => {
    const { tabInfo } = usePanelStore.getState();
    if (tabInfo?.kind !== 'auditable') return;
    const granted = await grantOriginPermission(tabInfo.origin);
    if (granted) await usePanelStore.getState().refreshTab();
  },

  inspect: async () => {
    const { tabInfo } = usePanelStore.getState();
    if (tabInfo?.kind !== 'auditable' || !tabInfo.hasOriginPermission) return;
    set({ inspectBusy: true, error: null });
    const response = await inspectPage();
    set({
      inspectBusy: false,
      inspectResult: response.ok ? response.data : null,
      error: response.ok ? null : response.error,
    });
  },

  updateSettings: async (next: Settings) => {
    set({ settingsStatus: 'saving', error: null });
    const response = await sendSaveSettings(next);
    if (response.ok) {
      set({ settings: response.data, settingsStatus: 'saved' });
    } else {
      set({ settingsStatus: 'error', error: response.error });
    }
  },

  resetSettings: async () => {
    const settings = await sendResetSettings();
    if (settings) set({ settings, settingsStatus: 'reset', error: null });
  },

  startAudit: async () => {
    const { tabInfo } = usePanelStore.getState();
    if (tabInfo?.kind !== 'auditable' || !tabInfo.hasOriginPermission) return;
    set({ auditBusy: true, error: null });
    const response = await sendStartAudit();
    if (response.ok) {
      const session = await getSession(response.data.sessionId);
      set({ session, auditBusy: true });
      // Poll routes until the session completes.
      void (async () => {
        while (usePanelStore.getState().session?.status === 'running') {
          await usePanelStore.getState().refreshRoutes();
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const latest = await getSession(usePanelStore.getState().session?.id);
          if (latest) set({ session: latest });
          if (latest?.status !== 'running') break;
        }
        set({ auditBusy: false });
        await usePanelStore.getState().refreshRoutes();
      })();
    } else {
      set({ auditBusy: false, error: response.error });
    }
  },

  stopAudit: async () => {
    const { session } = usePanelStore.getState();
    if (!session) return;
    await sendStopAudit(session.id);
    const latest = await getSession(session.id);
    set({ session: latest ?? session, auditBusy: false });
    await usePanelStore.getState().refreshRoutes();
  },

  refreshRoutes: async () => {
    const { session } = usePanelStore.getState();
    if (!session) return;
    const routes = await listRoutes(session.id);
    set({ routes });
  },
}));
