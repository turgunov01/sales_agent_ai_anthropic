import type { NextFunction, Request, RequestHandler, Response } from "express";
import { forbidden, unauthorized } from "../../core/errors.js";
import { verifyPlatformToken } from "../../core/security/tokens.js";
import type { Repositories } from "../../domain/repositories.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      platformAdminId?: string;
    }
  }
}

/**
 * Отдельная проверка для платформенных маршрутов: свой секрет, свой тип токена,
 * своя таблица учётных записей. Токен арендатора здесь не проходит по построению.
 */
export function createPlatformAuthenticate(repos: Repositories): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const header = req.header("authorization");
    const [scheme, token] = (header ?? "").split(" ");
    if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
      next(unauthorized("Отсутствует заголовок Authorization"));
      return;
    }

    let adminId: string;
    try {
      adminId = verifyPlatformToken(token.trim()).adminId;
    } catch (error) {
      next(error);
      return;
    }

    repos.platform
      .findAdminById(adminId)
      .then((admin) => {
        if (!admin) {
          next(unauthorized("Оператор не найден"));
          return;
        }
        if (!admin.isActive) {
          next(forbidden("Учётная запись оператора отключена"));
          return;
        }
        req.platformAdminId = admin.id;
        next();
      })
      .catch(next);
  };
}

export function requirePlatformAdmin(req: Request): string {
  if (!req.platformAdminId) throw unauthorized();
  return req.platformAdminId;
}