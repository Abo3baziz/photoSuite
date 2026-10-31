import { getDb } from '../db';
import type { StateTransition } from '../../shared/domain/stateTransition';
import { StateTransitionSchema } from '../../shared/domain/stateTransition';
import { newId } from '../ids';

export const stateTransitionRepository = {
  async add(input: Omit<StateTransition, 'id' | 'observedAt'> & { observedAt?: number }): Promise<StateTransition> {
    const t: StateTransition = StateTransitionSchema.parse({
      ...input,
      id: newId('tr'),
      observedAt: input.observedAt ?? Date.now(),
    });
    await getDb().stateTransitions.add(t);
    return t;
  },
  async listBySession(sessionId: string): Promise<StateTransition[]> {
    return getDb().stateTransitions.where('sessionId').equals(sessionId).toArray();
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().stateTransitions.where('sessionId').equals(sessionId).delete();
  },
};
