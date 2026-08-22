import type { PrismaClient } from "@prisma/client";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { UserEntity } from "../../domain/entities.js";
import type { CreateUserInput, UsersRepository } from "../../domain/repositories.js";
import { mapUser } from "./mappers.js";

export class PrismaUsersRepository implements UsersRepository {
  constructor(
    private readonly db: GuardedDatabase,
    private readonly raw: PrismaClient,
  ) {}

  /** Точка определения арендатора при входе: email уникален глобально. */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const row = await this.raw.user.findUnique({ where: { email: email.toLowerCase() } });
    return row ? mapUser(row) : null;
  }

  async findByIdUnscoped(userId: string): Promise<UserEntity | null> {
    const row = await this.raw.user.findUnique({ where: { id: userId } });
    return row ? mapUser(row) : null;
  }

  async findById(companyId: string, userId: string): Promise<UserEntity | null> {
    const row = await this.db.user.findFirst({ where: { id: userId, companyId } });
    return row ? mapUser(row) : null;
  }

  async listByCompany(companyId: string): Promise<UserEntity[]> {
    const rows = await this.db.user.findMany({
      where: { companyId },
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapUser);
  }

  async countOwners(companyId: string): Promise<number> {
    return this.db.user.count({ where: { companyId, role: "OWNER", isActive: true } });
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const row = await this.db.user.create({
      data: {
        companyId: input.companyId,
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        fullName: input.fullName,
        role: input.role,
      },
    });
    return mapUser(row);
  }

  async update(
    companyId: string,
    userId: string,
    data: Partial<Pick<UserEntity, "fullName" | "role" | "isActive" | "passwordHash">>,
  ): Promise<UserEntity | null> {
    const result = await this.db.user.updateMany({ where: { id: userId, companyId }, data });
    if (result.count === 0) return null;
    return this.findById(companyId, userId);
  }

  async delete(companyId: string, userId: string): Promise<boolean> {
    const result = await this.db.user.deleteMany({ where: { id: userId, companyId } });
    return result.count > 0;
  }

  async touchLastLogin(companyId: string, userId: string, at: Date): Promise<void> {
    await this.db.user.updateMany({
      where: { id: userId, companyId },
      data: { lastLoginAt: at },
    });
  }
}