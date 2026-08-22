import type { CompanyStatus } from "@ai-sales/shared";
import type { CompanyEntity, UserEntity } from "./entities.js";
import type { Paged, PageQuery } from "./repositories.js";

/**
 * Платформенный слой: оператор SaaS видит все компании сразу.
 * Это единственная часть системы, которая работает поверх арендаторов,
 * поэтому она вынесена в отдельный порт и отдельную таблицу учётных записей —
 * пользователь компании никогда не может дорасти до этих прав.
 */

export interface PlatformAdminEntity {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
}

export interface PlatformSessionEntity {
  id: string;
  adminId: string;
  refreshTokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
}

export interface CompanySummary {
  company: CompanyEntity;
  users: number;
  products: number;
  conversations: number;
  leads: number;
  qualifiedLeads: number;
  channelConnected: boolean;
  lastActivityAt: Date | null;
}

export interface PlatformAuditEntry {
  id: string;
  adminId: string;
  adminEmail: string | null;
  action: string;
  companyId: string | null;
  details: unknown;
  createdAt: Date;
}

export interface CompanyListQuery extends PageQuery {
  search?: string;
  status?: CompanyStatus;
}

export interface PlatformRepository {
  findAdminByEmail(email: string): Promise<PlatformAdminEntity | null>;
  findAdminById(adminId: string): Promise<PlatformAdminEntity | null>;
  countAdmins(): Promise<number>;
  createAdmin(input: {
    email: string;
    passwordHash: string;
    fullName: string;
  }): Promise<PlatformAdminEntity>;
  touchAdminLogin(adminId: string, at: Date): Promise<void>;

  createSession(input: {
    adminId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<PlatformSessionEntity>;
  findSessionByHash(hash: string): Promise<PlatformSessionEntity | null>;
  revokeSessionByHash(hash: string, at: Date): Promise<void>;
  revokeAllSessions(adminId: string, at: Date): Promise<void>;

  listCompanies(query: CompanyListQuery): Promise<Paged<CompanySummary>>;
  getCompany(companyId: string): Promise<CompanySummary | null>;
  listCompanyUsers(companyId: string): Promise<UserEntity[]>;
  setCompanyStatus(companyId: string, status: CompanyStatus): Promise<CompanyEntity | null>;

  addAuditEntry(input: {
    adminId: string;
    action: string;
    companyId: string | null;
    details: unknown;
    ip: string | null;
  }): Promise<void>;
  listAuditEntries(limit: number): Promise<PlatformAuditEntry[]>;
}