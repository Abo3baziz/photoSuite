import { getDb } from '../db';
import type { Screenshot, ScreenshotBlob } from '../../shared/domain/screenshot';
import { ScreenshotSchema, ScreenshotBlobSchema } from '../../shared/domain/screenshot';
import { newId } from '../ids';

export const screenshotRepository = {
  async create(input: Omit<Screenshot, 'id' | 'createdAt'> & { createdAt?: number }): Promise<Screenshot> {
    const screenshot: Screenshot = ScreenshotSchema.parse({
      ...input,
      id: newId('shot'),
      createdAt: input.createdAt ?? Date.now(),
    });
    await getDb().screenshots.add(screenshot);
    return screenshot;
  },
  async get(id: string): Promise<Screenshot | undefined> {
    return getDb().screenshots.get(id);
  },
  async listBySession(sessionId: string): Promise<Screenshot[]> {
    return getDb().screenshots.where('sessionId').equals(sessionId).toArray();
  },
  async listByInteraction(interactionId: string): Promise<Screenshot[]> {
    return getDb().screenshots.where('interactionId').equals(interactionId).toArray();
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().screenshots.where('sessionId').equals(sessionId).delete();
  },
};

export const screenshotBlobRepository = {
  async put(blob: ScreenshotBlob): Promise<void> {
    const validated = ScreenshotBlobSchema.parse(blob);
    await getDb().screenshotBlobs.put(validated);
  },
  async get(id: string): Promise<ScreenshotBlob | undefined> {
    return getDb().screenshotBlobs.get(id);
  },
  async delete(id: string): Promise<void> {
    await getDb().screenshotBlobs.delete(id);
  },
  async deleteBySession(sessionId: string): Promise<void> {
    // screenshotBlobs are keyed by screenshotId; cascade via screenshot list
    const shots = await screenshotRepository.listBySession(sessionId);
    await getDb().screenshotBlobs.bulkDelete(shots.map((s) => s.id));
  },
};
