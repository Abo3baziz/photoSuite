import { getDb } from '../db';
import type { Interaction, NewInteraction } from '../../shared/domain/interaction';
import { InteractionSchema } from '../../shared/domain/interaction';
import { newId } from '../ids';

export const interactionRepository = {
  async create(input: NewInteraction): Promise<Interaction> {
    const now = Date.now();
    const interaction: Interaction = InteractionSchema.parse({
      ...input,
      id: newId('ix'),
      createdAt: input.createdAt ?? now,
      updatedAt: input.updatedAt ?? now,
    });
    await getDb().interactions.add(interaction);
    return interaction;
  },
  async get(id: string): Promise<Interaction | undefined> {
    return getDb().interactions.get(id);
  },
  async listBySession(sessionId: string): Promise<Interaction[]> {
    return getDb().interactions.where('sessionId').equals(sessionId).toArray();
  },
  async update(id: string, patch: Partial<Interaction>): Promise<void> {
    await getDb().interactions.update(id, { ...patch, updatedAt: Date.now() });
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().interactions.where('sessionId').equals(sessionId).delete();
  },
};
