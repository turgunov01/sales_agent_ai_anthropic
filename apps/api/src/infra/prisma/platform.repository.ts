import type { PrismaClient } from "@prisma/client";
import { CompanyStatus, LeadStatus } from "@ai-sales/shared";
import type { CompanyEntity, UserEntity } from "../../domain/entities.js";
import type {
  CompanyListQuery,
  CompanySummary,
  PlatformAdminEntity,
  PlatformAuditEntry,
  PlatformRepository,
  PlatformSessionEntity,
} from "../../domain/platform.js";
import type { Paged } from "../../domain/repositories.js";
import { mapCompany, mapUser } from "./mappers.js";

type Row = Record<string, unknown>;

const mapAdmin = (row: Row): PlatformAdminEntity => ({
  id: row.id as string,
  email: row.email as string,
  passwordHash: row.passwordHash as string,
  fullName: row.fullName as string,
  isActive: row.isActive as boolean,
  lastLoginAt: (row.lastLoginAt as Date | null) ?? null,
  createdAt: row.createdAt as Date,
});

const mapSession = (row: Row): PlatformSessionEntity => ({
  id: row.id as string,
  adminId: row.adminId as string,
  refreshTokenHash: row.refreshTokenHash as string,
  expiresAt: row.expiresAt as Date,
  revokedAt: (row.revokedAt as Date | null) ?? null,
});

/**
 * Реализация поверх незащищённого клиента: запросы намеренно охватывают
 * все компании. Это третья и последняя санкционированная точка обхода
 * guard-расширения (см. docs/07-security-model.md).
 */
export class PrismaPlatformRepository implements PlatformRepository {
  constructor(private readonly raw: PrismaClient) {}

  async findAdminByEmail(email: string): Promise<PlatformAdminEntity | null> {
    const row = await this.raw.platformAdmin.findUnique({ where: { email: email.toLowerCase() } });
    return row ? mapAdmin(row) : null;
  }

  async findAdminById(adminId: string): Promise<PlatformAdminEntity | null> {
    const row = await this.raw.platformAdmin.findUnique({ where: { id: adminId } });
    return row ? mapAdmin(row) : null;
  }

  async countAdmins(): Promise<number> {
    return this.raw.platformAdmin.count();
  }

  async createAdmin(input: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<PlatformAdminEntity> {
    const row = await this.raw.platformAdmin.create({
      data: { ...input, email: input.email.toLowerCase() },
    });
    return mapAdmin(row);
  }

  async touchAdminLogin(adminId: string, at: Date): Promise<void> {
    await this.raw.platformAdmin.update({ where: { id: adminId }, data: { lastLoginAt: at } });
  }

  async createSession(input: {
    adminId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<PlatformSessionEntity> {
    const row = await this.raw.platformSession.create({ data: input });
    return mapSession(row);
  }

  async findSessionByHash(hash: string): Promise<PlatformSessionEntity | null> {
    const row = await this.raw.platformSession.findUnique({ where: { refreshTokenHash: hash } });
    return row ? mapSession(row) : null;
  }

  async revokeSessionByHash(hash: string, at: Date): Promise<void> {
    await this.raw.platformSession.updateMany({
      where: { refreshTokenHash: hash, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async revokeAllSessions(adminId: string, at: Date): Promise<void> {
    await this.raw.platformSession.updateMany({
      where: { adminId, revokedAt: null },
      data: { revokedAt: at },
    });
  }

  async listCompanies(query: CompanyListQuery): Promise<Paged<CompanySummary>> {
    const where: Record<string, unknown> = {};
    if (query.status) where.status = query.status;
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: "insensitive" } },
        { slug: { contains: query.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.raw.company.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        include: {
          _count: { select: { users: true, products: true, conversations: true, leads: true } },
        },
      }),
      this.raw.company.count({ where }),
    ]);

    const items = await this.decorate(rows);
    return { items, total };
  }

  async getCompany(companyId: string): Promise<CompanySummary | null> {
    const row = await this.raw.company.findUnique({
      where: { id: companyId },
      include: {
        _count: { select: { users: true, products: true, conversations: true, leads: true } },
      },
    });
    if (!row) return null;
    const [summary] = await this.decorate([row]);
    return summary ?? null;
  }

  async listCompanyUsers(companyId: string): Promise<UserEntity[]> {
    const rows = await this.raw.user.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapUser);
  }

  async setCompanyStatus(companyId: string, status: CompanyStatus): Promise<CompanyEntity | null> {
    const result = await this.raw.company.updateMany({ where: { id: companyId }, data: { status } });
    if (result.count === 0) return null;
    const row = await this.raw.company.findUnique({ where: { id: companyId } });
    return row ? mapCompany(row) : null;
  }

  async addAuditEntry(input: {
    adminId: string;
    action: string;
    companyId: string | null;
    details: unknown;
    ip: string | null;
  }): Promise<void> {
    await this.raw.platformAuditLog.create({
      data: {
        adminId: input.adminId,
        action: input.action,
        companyId: input.companyId,
        details: (input.details ?? undefined) as never,
        ip: input.ip,
      },
    });
  }

  async listAuditEntries(limit: number): Promise<PlatformAuditEntry[]> {
    const rows = await this.raw.platformAuditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { admin: { select: { email: true } } },
    });
    return rows.map((row) => ({
      id: row.id,
      adminId: row.adminId,
      adminEmail: row.admin?.email ?? null,
      action: row.action,
      companyId: row.companyId,
      details: row.details,
      createdAt: row.createdAt,
    }));
  }

  /** Метрики, которых нет в _count: квалифицированные лиды, канал, активность. */
  private async decorate(
    rows: Array<Row & { _count: Record<string, number> }>,
  ): Promise<CompanySummary[]> {
    const ids = rows.map((row) => row.id as string);
    if (ids.length === 0) return [];

    const [qualified, channels, activity] = await Promise.all([
      this.raw.lead.groupBy({
        by: ["companyId"],
        where: { companyId: { in: ids }, status: { in: [LeadStatus.QUALIFIED, LeadStatus.WON] } },
        _count: { _all: true },
      }),
      this.raw.channel.findMany({
        where: { companyId: { in: ids }, isActive: true },
        select: { companyId: true },
      }),
      this.raw.conversation.groupBy({
        by: ["companyId"],
        where: { companyId: { in: ids } },
        _max: { lastMessageAt: true },
      }),
    ]);

    const qualifiedBy = new Map(qualified.map((row) => [row.companyId, row._count._all]));
    const connected = new Set(channels.map((row) => row.companyId));
    const activityBy = new Map(activity.map((row) => [row.companyId, row._max.lastMessageAt]));

    return rows.map((row) => ({
      company: mapCompany(row),
      users: row._count.users ?? 0,
      products: row._count.products ?? 0,
      conversations: row._count.conversations ?? 0,
      leads: row._count.leads ?? 0,
      qualifiedLeads: qualifiedBy.get(row.id as string) ?? 0,
      channelConnected: connected.has(row.id as string),
      lastActivityAt: activityBy.get(row.id as string) ?? null,
    }));
  }
}

export const PLATFORM_COMPANY_STATUSES = [CompanyStatus.ACTIVE, CompanyStatus.SUSPENDED];