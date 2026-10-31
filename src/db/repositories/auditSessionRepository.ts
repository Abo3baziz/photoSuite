import { getDb } from '../db';
import type { AuditSession, NewAuditSession } from '../../shared/domain/auditSession';
import { AuditSessionSchema } from '../../shared/domain/auditSession';
import { newId } from '../ids';

export const auditSessionRepository = {
  async create(input: NewAuditSession): Promise<AuditSession> {
    const now = Date.now();
    const session: AuditSession = AuditSessionSchema.parse({
      ...input,
      id: newId('ses'),
      startedAt: now,
      updatedAt: now,
    });
    await getDb().auditSessions.add(session);
    return session;
  },
  async get(id: string): Promise<AuditSession | undefined> {
    return getDb().auditSessions.get(id);
  },
  async list(): Promise<AuditSession[]> {
    return getDb().auditSessions.orderBy('startedAt').reverse().toArray();
  },
  async updateStatus(
    id: string,
    status: AuditSession['status'],
    reason: string | null = null,
  ): Promise<void> {
    await getDb().auditSessions.update(id, { status, statusReason: reason, updatedAt: Date.now() });
  },
  async delete(id: string): Promise<void> {
    const db = getDb();
    await db.transaction('rw', db.tables, async () => {
      for (const table of db.tables) {
        if (table.name === 'auditSessions') continue;
        await (
          table as unknown as {
            where: (k: string) => { equals: (v: string) => { delete: () => Promise<number> } };
          }
        )
          .where('sessionId')
          .equals(id)
          .delete();
      }
      await db.auditSessions.delete(id);
    });
  },
};
