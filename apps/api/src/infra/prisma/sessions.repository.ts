import type { GuardedDatabase } from "../../core/prisma.js";
import type { SessionEntity } from "../../domain/entities.js";
import type { SessionsRepository } from "../../domain/repositories.js";
import { mapSession } from "./mappers.js";

export class PrismaSessionsRepository implements SessionsRepository {
  constructor(private readonly db: GuardedDatabase) {}

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<SessionEntity> {
    const row = await this.db.session.create({ data: input });
    return mapSession(row);
  }

  async findByHash(hash: string): Promise<SessionEntity | null> {
    const row = await this.db.session.findUnique({ where: { refreshTokenHash: hash } });
    return row ? mapSession(row) : null;
  }

  async revokeByHash(hash: string, at: Date): Promise<void> {
    await this.db.session.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    await this.db.session.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async revokeAllForCompany(companyId: string, at: Date): Promise<void> {
    const users = await this.db.user.findMany({ where: { companyId }, select: { id: true } });
    if (users.length === 0) return;
    await this.db.session.updateMany({
      where: { userId: { in: users.map((user) => user.id) }, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async deleteExpired(before: Date): Promise<number> {
    const result = await this.db.session.deleteMany({ where: { expiresAt: { lt: before } } });
    return result.count;
  }
}