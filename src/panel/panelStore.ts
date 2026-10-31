import { create } from 'zustand';
import type { ActiveTabInfo, InspectSummary } from '../shared/messaging/protocol';
import type { Settings } from '../shared/config/settings';
import type { RpcError } from '../shared/messaging/rpc';
import {
  getActiveTabInfo as fetchActiveTabInfo,
  getSettings as fetchSettings,
  inspectPage,
  resetSettings as sendResetSettings,
  saveSettings as sendSaveSettings,
} from './messaging/client';
import { grantOriginPermission } from './permissions/originPermissions';

/**
 * Panel state (no business logic in components — AGENTS.md 2): every action
 * delegates to the background via the message client or performs a local,
 * gesture-bound permission request.
 */

export type ConnectionState = 'connecting' | 'connected' | 'disconnected';

export interface PanelState {
  connection: ConnectionState;
  tabInfo: ActiveTabInfo | null;
  inspectResult: InspectSummary | null;
  inspectBusy: boolean;
  settings: Settings | null;
  settingsStatus: 'idle' | 'saving' | 'saved' | 'error' | 'reset';
  error: RpcError | null;
  initialize: () => Promise<void>;
  refreshTab: () => Promise<void>;
  grantOrigin: () => Promise<void>;
  inspect: () => Promise<void>;
  updateSettings: (next: Settings) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const usePanelStore = create<PanelState>((set) => ({
  connection: 'connecting',
  tabInfo: null,
  inspectResult: null,
  inspectBusy: false,
  settings: null,
  settingsStatus: 'idle',
  error: null,

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
}));
