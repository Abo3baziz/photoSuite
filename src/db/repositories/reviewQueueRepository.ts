import { getDb } from '../db';
import type { ReviewQueueItem, ReviewQueueStatus } from '../../shared/domain/reviewQueueItem';
import { ReviewQueueItemSchema } from '../../shared/domain/reviewQueueItem';
import { newId } from '../ids';

export const reviewQueueRepository = {
  async enqueue(sessionId: string, elementId: string, reason: string): Promise<ReviewQueueItem> {
    const item: ReviewQueueItem = ReviewQueueItemSchema.parse({
      id: newId('rq'),
      sessionId,
      elementId,
      status: 'queued' as ReviewQueueStatus,
      reason,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    await getDb().reviewQueue.add(item);
    return item;
  },
  async listBySession(sessionId: string, status?: ReviewQueueStatus): Promise<ReviewQueueItem[]> {
    const base = getDb().reviewQueue.where('sessionId').equals(sessionId);
    const all = await base.toArray();
    return status ? all.filter((i) => i.status === status) : all;
  },
  async updateStatus(id: string, status: ReviewQueueStatus): Promise<void> {
    await getDb().reviewQueue.update(id, { status, updatedAt: Date.now() });
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().reviewQueue.where('sessionId').equals(sessionId).delete();
  },
};
