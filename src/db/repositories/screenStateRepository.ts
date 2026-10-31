import { getDb } from '../db';
import type { ScreenState, NewScreenState } from '../../shared/domain/screenState';
import { ScreenStateSchema } from '../../shared/domain/screenState';
import { newId } from '../ids';

export const screenStateRepository = {
  async upsert(sessionId: string, state: NewScreenState): Promise<ScreenState> {
    const db = getDb();
    const existing = await db.screenStates
      .where('[sessionId+fingerprint]')
      .equals([sessionId, state.fingerprint])
      .first();
    if (existing) return existing;
    const created: ScreenState = ScreenStateSchema.parse({
      ...state,
      id: newId('state'),
      sessionId,
      discoveredAt: state.discoveredAt ?? Date.now(),
    });
    await db.screenStates.add(created);
    return created;
  },
  async get(id: string): Promise<ScreenState | undefined> {
    return getDb().screenStates.get(id);
  },
  async listBySession(sessionId: string): Promise<ScreenState[]> {
    return getDb().screenStates.where('sessionId').equals(sessionId).toArray();
  },
  async listByRoute(sessionId: string, routeId: string): Promise<ScreenState[]> {
    return getDb().screenStates.where('[sessionId+routeId]').equals([sessionId, routeId]).toArray();
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().screenStates.where('sessionId').equals(sessionId).delete();
  },
};
