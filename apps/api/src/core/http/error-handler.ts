import { Prisma } from "@prisma/client";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { ApiErrorCode, type ApiError } from "@ai-sales/shared";
import { env } from "../../config/env.js";
import { AppError, TenantScopeError } from "../errors.js";
import { logger } from "../logger.js";
import { zodIssuesToDetails } from "./validate.js";

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof ZodError) {
    return new AppError(ApiErrorCode.VALIDATION_ERROR, "Некорректные данные запроса", {
      details: zodIssuesToDetails(error),
    });
  }

  if (error instanceof TenantScopeError) {
    // Наружу — обычная 404: существование чужих данных не подтверждаем.
    return new AppError(ApiErrorCode.NOT_FOUND, "Ресурс не найден", { cause: error });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      return new AppError(ApiErrorCode.CONFLICT, "Запись с такими данными уже существует", {
        cause: error,
      });
    }
    if (error.code === "P2025") {
      return new AppError(ApiErrorCode.NOT_FOUND, "Ресурс не найден", { cause: error });
    }
    if (error.code === "P2003") {
      return new AppError(ApiErrorCode.VALIDATION_ERROR, "Ссылка на несуществующую запись", {
        cause: error,
      });
    }
  }

  return new AppError(ApiErrorCode.INTERNAL_ERROR, "Внутренняя ошибка сервера", { cause: error });
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const appError = toAppError(error);
  const logPayload = {
    err: appError.cause ?? error,
    requestId: req.requestId,
    method: req.method,
    path: req.originalUrl,
    code: appError.code,
  };

  if (appError.status >= 500) {
    logger.error(logPayload, appError.message);
  } else {
    logger.warn(logPayload, appError.message);
  }

  const body: ApiError = {
    success: false,
    error: {
      code: appError.code,
      message:
        appError.status >= 500 && env.isProduction ? "Внутренняя ошибка сервера" : appError.message,
      ...(appError.details ? { details: appError.details } : {}),
    },
    requestId: req.requestId,
  };

  res.status(appError.status).json(body);
}

export function notFoundHandler(req: Request, res: Response): void {
  const body: ApiError = {
    success: false,
    error: { code: ApiErrorCode.NOT_FOUND, message: `Маршрут ${req.method} ${req.path} не найден` },
    requestId: req.requestId,
  };
  res.status(404).json(body);
}