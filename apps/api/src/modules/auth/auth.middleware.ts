import type { NextFunction, Request, RequestHandler, Response } from "express";
import { CompanyStatus, type UserRole } from "@ai-sales/shared";
import { forbidden, unauthorized } from "../../core/errors.js";
import { verifyAccessToken, type AuthContext } from "../../core/security/tokens.js";
import type { Repositories } from "../../domain/repositories.js";

function extractBearer(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

/**
 * Проверяет токен и подтверждает, что пользователь всё ещё активен.
 * companyId берётся исключительно из токена — не из тела и не из query.
 */
export function createAuthenticate(repos: Repositories): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const token = extractBearer(req.header("authorization"));
    if (!token) {
      next(unauthorized("Отсутствует заголовок Authorization"));
      return;
    }

    let context: AuthContext;
    try {
      context = verifyAccessToken(token);
    } catch (error) {
      next(error);
      return;
    }

    repos.users
      .findById(context.companyId, context.userId)
      .then((user) => {
        if (!user) {
          next(unauthorized("Пользователь не найден"));
          return;
        }
        if (!user.isActive) {
          next(forbidden("Учётная запись отключена"));
          return;
        }
        return repos.companies.findById(user.companyId).then((company) => {
          if (!company || company.status === CompanyStatus.SUSPENDED) {
            next(forbidden("Компания заблокирована. Обратитесь в поддержку."));
            return;
          }
          req.auth = { userId: user.id, companyId: user.companyId, role: user.role };
          next();
        });
      })
      .catch(next);
  };
}

export function requireRole(...roles: UserRole[]): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) {
      next(unauthorized());
      return;
    }
    if (!roles.includes(req.auth.role)) {
      next(forbidden("Недостаточно прав для этого действия"));
      return;
    }
    next();
  };
}

export function requireAuth(req: Request): AuthContext {
  if (!req.auth) throw unauthorized();
  return req.auth;
}