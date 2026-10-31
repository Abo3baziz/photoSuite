import { getDb } from '../db';
import type { Route, NewRoute } from '../../shared/domain/route';
import { RouteSchema } from '../../shared/domain/route';
import { newId } from '../ids';

export const routeRepository = {
  async upsert(sessionId: string, route: NewRoute): Promise<Route> {
    const db = getDb();
    const existing = await db.routes
      .where('[sessionId+url]')
      .equals([sessionId, route.url])
      .first();
    if (existing) {
      const updated: Route = { ...existing, ...route, id: existing.id };
      await db.routes.put(updated);
      return updated;
    }
    const created: Route = RouteSchema.parse({
      ...route,
      id: newId('route'),
      sessionId,
      firstSeenAt: route.firstSeenAt ?? Date.now(),
      lastVisitedAt: null,
    });
    await db.routes.add(created);
    return created;
  },
  async get(id: string): Promise<Route | undefined> {
    return getDb().routes.get(id);
  },
  async listBySession(sessionId: string): Promise<Route[]> {
    return getDb().routes.where('sessionId').equals(sessionId).toArray();
  },
  async findByUrl(sessionId: string, url: string): Promise<Route | undefined> {
    return getDb().routes.where('[sessionId+url]').equals([sessionId, url]).first();
  },
  async updateStatus(id: string, status: Route['status']): Promise<void> {
    await getDb().routes.update(id, { status, lastVisitedAt: Date.now() });
  },
  async deleteBySession(sessionId: string): Promise<void> {
    await getDb().routes.where('sessionId').equals(sessionId).delete();
  },
};
