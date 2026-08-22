import {
  CompanyStatus,
  type AuthTokensDto,
  type CompanyDetailDto,
  type CompanySummaryDto,
  type PaginationMeta,
  type PlatformAdminDto,
  type PlatformAuditDto,
} from "@ai-sales/shared";
import { env } from "../../config/env.js";
import { conflict, forbidden, notFound, unauthorized } from "../../core/errors.js";
import { buildPaginationMeta } from "../../core/http/respond.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import {
  accessTokenTtlSeconds,
  generateRefreshToken,
  hashRefreshToken,
  signPlatformToken,
} from "../../core/security/tokens.js";
import { normalizePhone } from "../../core/utils/phone.js";
import { slugify } from "../../core/utils/text.js";
import type { CompanySummary, PlatformAdminEntity } from "../../domain/platform.js";
import type { Repositories } from "../../domain/repositories.js";
import { toUserDto } from "../shared/mappers.js";
import type {
  CreateCompanyInput,
  ListCompaniesQuery,
  SetStatusInput,
} from "./platform.schema.js";

export interface RequestMeta {
  userAgent: string | null;
  ip: string | null;
}

const toAdminDto = (admin: PlatformAdminEntity): PlatformAdminDto => ({
  id: admin.id,
  email: admin.email,
  fullName: admin.fullName,
  lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
});

const toSummaryDto = (summary: CompanySummary): CompanySummaryDto => ({
  id: summary.company.id,
  name: summary.company.name,
  slug: summary.company.slug,
  phone: summary.company.phone,
  status: summary.company.status,
  defaultLanguage: summary.company.defaultLanguage,
  createdAt: summary.company.createdAt.toISOString(),
  users: summary.users,
  products: summary.products,
  conversations: summary.conversations,
  leads: summary.leads,
  qualifiedLeads: summary.qualifiedLeads,
  channelConnected: summary.channelConnected,
  lastActivityAt: summary.lastActivityAt ? summary.lastActivityAt.toISOString() : null,
});

export class PlatformService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async login(
    input: { email: string; password: string },
    meta: RequestMeta,
  ): Promise<{ admin: PlatformAdminDto; tokens: AuthTokensDto }> {
    const admin = await this.repos.platform.findAdminByEmail(input.email);

    const matches = admin
      ? await verifyPassword(input.password, admin.passwordHash)
      : await verifyPassword(input.password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");

    if (!admin || !matches) throw unauthorized("Неверный email или пароль");
    if (!admin.isActive) throw forbidden("Учётная запись оператора отключена");

    const at = this.now();
    await this.repos.platform.touchAdminLogin(admin.id, at);
    await this.audit(admin.id, "login", null, null, meta.ip);

    return { admin: toAdminDto({ ...admin, lastLoginAt: at }), tokens: await this.issue(admin, meta) };
  }

  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokensDto> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.repos.platform.findSessionByHash(hash);
    if (!session) throw unauthorized("Сессия не найдена или уже завершена");

    const at = this.now();
    if (session.revokedAt || session.expiresAt.getTime() <= at.getTime()) {
      await this.repos.platform.revokeAllSessions(session.adminId, at);
      throw unauthorized("Сессия истекла, войдите заново");
    }

    await this.repos.platform.revokeSessionByHash(hash, at);
    const admin = await this.repos.platform.findAdminById(session.adminId);
    if (!admin || !admin.isActive) throw unauthorized("Учётная запись недоступна");
    return this.issue(admin, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.repos.platform.revokeSessionByHash(hashRefreshToken(refreshToken), this.now());
  }

  async me(adminId: string): Promise<PlatformAdminDto> {
    const admin = await this.repos.platform.findAdminById(adminId);
    if (!admin) throw unauthorized("Оператор не найден");
    return toAdminDto(admin);
  }

  async listCompanies(
    query: ListCompaniesQuery,
  ): Promise<{ items: CompanySummaryDto[]; meta: PaginationMeta }> {
    const result = await this.repos.platform.listCompanies(query);
    return {
      items: result.items.map(toSummaryDto),
      meta: buildPaginationMeta(query.page, query.limit, result.total),
    };
  }

  async getCompany(companyId: string): Promise<CompanyDetailDto> {
    const summary = await this.repos.platform.getCompany(companyId);
    if (!summary) throw notFound("Компания не найдена");
    const users = await this.repos.platform.listCompanyUsers(companyId);
    return { ...toSummaryDto(summary), staff: users.map(toUserDto) };
  }

  /** Ручное заведение клиента оператором: компания и владелец создаются вместе. */
  async createCompany(
    adminId: string,
    input: CreateCompanyInput,
    ip: string | null,
  ): Promise<CompanySummaryDto> {
    const existing = await this.repos.users.findByEmail(input.ownerEmail);
    if (existing) throw conflict("Пользователь с таким email уже зарегистрирован");

    const slug = await this.buildUniqueSlug(input.companyName);
    const passwordHash = await hashPassword(input.ownerPassword);

    const { company } = await this.repos.companies.createWithOwner({
      company: {
        name: input.companyName,
        slug,
        phone: input.phone ? normalizePhone(input.phone) : null,
        defaultLanguage: input.defaultLanguage,
      },
      owner: { email: input.ownerEmail, passwordHash, fullName: input.ownerFullName },
    });

    await this.audit(adminId, "company.create", company.id, { name: company.name, slug }, ip);

    const summary = await this.repos.platform.getCompany(company.id);
    if (!summary) throw notFound("Компания не найдена");
    return toSummaryDto(summary);
  }

  async setStatus(
    adminId: string,
    companyId: string,
    input: SetStatusInput,
    ip: string | null,
  ): Promise<CompanySummaryDto> {
    const updated = await this.repos.platform.setCompanyStatus(companyId, input.status);
    if (!updated) throw notFound("Компания не найдена");

    if (input.status === CompanyStatus.SUSPENDED) {
      // Блокировка должна отсекать и активные сессии сотрудников компании.
      await this.repos.sessions.revokeAllForCompany(companyId, this.now());
    }

    await this.audit(
      adminId,
      input.status === CompanyStatus.SUSPENDED ? "company.suspend" : "company.activate",
      companyId,
      { reason: input.reason },
      ip,
    );

    const summary = await this.repos.platform.getCompany(companyId);
    if (!summary) throw notFound("Компания не найдена");
    return toSummaryDto(summary);
  }

  async auditLog(limit: number): Promise<PlatformAuditDto[]> {
    const entries = await this.repos.platform.listAuditEntries(limit);
    return entries.map((entry) => ({
      id: entry.id,
      adminEmail: entry.adminEmail,
      action: entry.action,
      companyId: entry.companyId,
      createdAt: entry.createdAt.toISOString(),
    }));
  }

  private async audit(
    adminId: string,
    action: string,
    companyId: string | null,
    details: unknown,
    ip: string | null,
  ): Promise<void> {
    await this.repos.platform.addAuditEntry({ adminId, action, companyId, details, ip });
  }

  private async issue(admin: PlatformAdminEntity, meta: RequestMeta): Promise<AuthTokensDto> {
    const refresh = generateRefreshToken();
    const expiresAt = new Date(
      this.now().getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    await this.repos.platform.createSession({
      adminId: admin.id,
      refreshTokenHash: refresh.hash,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt,
    });
    return {
      accessToken: signPlatformToken(admin.id),
      refreshToken: refresh.token,
      expiresIn: accessTokenTtlSeconds(),
    };
  }

  private async buildUniqueSlug(companyName: string): Promise<string> {
    const base = slugify(companyName);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      if (!(await this.repos.companies.findBySlug(candidate))) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}