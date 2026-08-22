import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import jwt from "jsonwebtoken";
import type { UserRole } from "@ai-sales/shared";
import { env } from "../../config/env.js";
import { unauthorized } from "../errors.js";

export interface AccessTokenPayload {
  sub: string;
  companyId: string;
  role: UserRole;
  type: "access";
}

export interface AuthContext {
  userId: string;
  companyId: string;
  role: UserRole;
}

export function signAccessToken(context: AuthContext): string {
  const payload: AccessTokenPayload = {
    sub: context.userId,
    companyId: context.companyId,
    role: context.role,
    type: "access",
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyAccessToken(token: string): AuthContext {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  } catch {
    throw unauthorized("Токен недействителен или истёк");
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    (decoded as AccessTokenPayload).type !== "access"
  ) {
    throw unauthorized("Неверный тип токена");
  }

  const payload = decoded as AccessTokenPayload;
  if (!payload.sub || !payload.companyId || !payload.role) {
    throw unauthorized("Токен неполный");
  }

  return { userId: payload.sub, companyId: payload.companyId, role: payload.role };
}

interface PlatformTokenPayload {
  sub: string;
  type: "platform";
}

/** Токен оператора платформы подписывается отдельным секретом. */
export function signPlatformToken(adminId: string): string {
  const payload: PlatformTokenPayload = { sub: adminId, type: "platform" };
  return jwt.sign(payload, env.PLATFORM_JWT_SECRET, {
    expiresIn: env.ACCESS_TOKEN_TTL as jwt.SignOptions["expiresIn"],
  });
}

export function verifyPlatformToken(token: string): { adminId: string } {
  let decoded: unknown;
  try {
    decoded = jwt.verify(token, env.PLATFORM_JWT_SECRET);
  } catch {
    throw unauthorized("Токен недействителен или истёк");
  }

  if (
    typeof decoded !== "object" ||
    decoded === null ||
    (decoded as PlatformTokenPayload).type !== "platform"
  ) {
    throw unauthorized("Неверный тип токена");
  }

  const payload = decoded as PlatformTokenPayload;
  if (!payload.sub) throw unauthorized("Токен неполный");
  return { adminId: payload.sub };
}

/** Refresh-токен — случайная строка; в БД хранится только её SHA-256. */
export function generateRefreshToken(): { token: string; hash: string } {
  const token = randomBytes(48).toString("base64url");
  return { token, hash: hashRefreshToken(token) };
}

export function hashRefreshToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function accessTokenTtlSeconds(): number {
  const match = /^(\d+)(ms|s|m|h|d)$/.exec(env.ACCESS_TOKEN_TTL);
  if (!match) return 900;
  const amount = Number(match[1]);
  const unitMultipliers: Record<string, number> = { ms: 0.001, s: 1, m: 60, h: 3600, d: 86400 };
  return Math.floor(amount * (unitMultipliers[match[2] as string] ?? 1));
}

/** Сравнение секретов постоянного времени (вебхуки Telegram). */
export function safeCompare(a: string, b: string): boolean {
  const bufferA = Buffer.from(a);
  const bufferB = Buffer.from(b);
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}