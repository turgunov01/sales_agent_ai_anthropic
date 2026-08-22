import {
  CompanyStatus,
  type AuthResultDto,
  type AuthTokensDto,
  type CompanyDto,
  type UserDto,
} from "@ai-sales/shared";
import { env } from "../../config/env.js";
import { conflict, forbidden, notFound, unauthorized } from "../../core/errors.js";
import { hashPassword, verifyPassword } from "../../core/security/password.js";
import {
  accessTokenTtlSeconds,
  generateRefreshToken,
  hashRefreshToken,
  signAccessToken,
  type AuthContext,
} from "../../core/security/tokens.js";
import { slugify } from "../../core/utils/text.js";
import { normalizePhone } from "../../core/utils/phone.js";
import type { UserEntity } from "../../domain/entities.js";
import type { Repositories } from "../../domain/repositories.js";
import { toCompanyDto, toUserDto } from "../shared/mappers.js";
import type { LoginInput, RegisterInput } from "./auth.schema.js";

export interface RequestMeta {
  userAgent: string | null;
  ip: string | null;
}

export class AuthService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async register(input: RegisterInput, meta: RequestMeta): Promise<AuthResultDto> {
    const existing = await this.repos.users.findByEmail(input.email);
    if (existing) throw conflict("Пользователь с таким email уже зарегистрирован");

    const slug = await this.buildUniqueSlug(input.companyName);
    const passwordHash = await hashPassword(input.password);
    const phone = input.phone ? normalizePhone(input.phone) : null;

    const { company, owner } = await this.repos.companies.createWithOwner({
      company: {
        name: input.companyName,
        slug,
        phone,
        defaultLanguage: input.defaultLanguage,
      },
      owner: { email: input.email, passwordHash, fullName: input.fullName },
    });

    const tokens = await this.issueTokens(owner, meta);
    return { user: toUserDto(owner), company: toCompanyDto(company), tokens };
  }

  async login(input: LoginInput, meta: RequestMeta): Promise<AuthResultDto> {
    const user = await this.repos.users.findByEmail(input.email);

    // Пароль проверяем даже при отсутствии пользователя: одинаковое время ответа.
    const passwordMatches = user
      ? await verifyPassword(input.password, user.passwordHash)
      : await verifyPassword(input.password, "scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");

    if (!user || !passwordMatches) throw unauthorized("Неверный email или пароль");
    if (!user.isActive) throw forbidden("Учётная запись отключена");

    const company = await this.repos.companies.findById(user.companyId);
    if (!company) throw notFound("Компания не найдена");
    if (company.status === CompanyStatus.SUSPENDED) {
      throw forbidden("Компания заблокирована. Обратитесь в поддержку.");
    }

    const at = this.now();
    await this.repos.users.touchLastLogin(user.companyId, user.id, at);

    const tokens = await this.issueTokens(user, meta);
    return {
      user: toUserDto({ ...user, lastLoginAt: at }),
      company: toCompanyDto(company),
      tokens,
    };
  }

  /**
   * Ротация refresh-токена. Использованный токен удаляется из обращения,
   * поэтому повторное предъявление того же токена не проходит.
   */
  async refresh(refreshToken: string, meta: RequestMeta): Promise<AuthTokensDto> {
    const hash = hashRefreshToken(refreshToken);
    const session = await this.repos.sessions.findByHash(hash);
    if (!session) throw unauthorized("Сессия не найдена или уже завершена");

    const at = this.now();
    if (session.revokedAt || session.expiresAt.getTime() <= at.getTime()) {
      // Возможная попытка повторного использования — гасим все сессии пользователя.
      await this.repos.sessions.revokeAllForUser(session.userId, at);
      throw unauthorized("Сессия истекла, войдите заново");
    }

    await this.repos.sessions.revokeByHash(hash, at);

    const user = await this.findActiveUserById(session.userId);
    return this.issueTokens(user, meta);
  }

  async logout(refreshToken: string): Promise<void> {
    await this.repos.sessions.revokeByHash(hashRefreshToken(refreshToken), this.now());
  }

  async me(auth: AuthContext): Promise<{ user: UserDto; company: CompanyDto }> {
    const user = await this.repos.users.findById(auth.companyId, auth.userId);
    if (!user) throw unauthorized("Пользователь не найден");
    const company = await this.repos.companies.findById(auth.companyId);
    if (!company) throw notFound("Компания не найдена");
    return { user: toUserDto(user), company: toCompanyDto(company) };
  }

  private async findActiveUserById(userId: string): Promise<UserEntity> {
    // Сессия знает только userId; компанию берём из самой записи пользователя.
    const user = await this.repos.users.findByIdUnscoped(userId);
    if (!user || !user.isActive) throw unauthorized("Учётная запись недоступна");

    const company = await this.repos.companies.findById(user.companyId);
    if (!company || company.status === CompanyStatus.SUSPENDED) {
      throw forbidden("Компания заблокирована. Обратитесь в поддержку.");
    }
    return user;
  }

  private async issueTokens(user: UserEntity, meta: RequestMeta): Promise<AuthTokensDto> {
    const accessToken = signAccessToken({
      userId: user.id,
      companyId: user.companyId,
      role: user.role,
    });
    const refresh = generateRefreshToken();
    const expiresAt = new Date(
      this.now().getTime() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.repos.sessions.create({
      userId: user.id,
      refreshTokenHash: refresh.hash,
      userAgent: meta.userAgent,
      ip: meta.ip,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: refresh.token,
      expiresIn: accessTokenTtlSeconds(),
    };
  }

  private async buildUniqueSlug(companyName: string): Promise<string> {
    const base = slugify(companyName);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const candidate = attempt === 0 ? base : `${base}-${attempt + 1}`;
      const existing = await this.repos.companies.findBySlug(candidate);
      if (!existing) return candidate;
    }
    return `${base}-${Date.now().toString(36)}`;
  }
}
