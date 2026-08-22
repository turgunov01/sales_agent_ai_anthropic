import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodTypeAny, type z } from "zod";
import type { ApiErrorDetail } from "@ai-sales/shared";
import { badRequest } from "../errors.js";

export interface ValidationSchemas {
  body?: ZodTypeAny;
  query?: ZodTypeAny;
  params?: ZodTypeAny;
}

export function zodIssuesToDetails(error: ZodError): ApiErrorDetail[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }));
}

/**
 * Валидирует запрос и кладёт результат в req.validated.
 * Исходные req.body/req.query не мутируются — контроллеры читают только validated.
 */
export function validate(schemas: ValidationSchemas): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.validated.body = schemas.body.parse(req.body);
      if (schemas.query) req.validated.query = schemas.query.parse(req.query);
      if (schemas.params) req.validated.params = schemas.params.parse(req.params);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        next(badRequest("Некорректные данные запроса", zodIssuesToDetails(error)));
        return;
      }
      next(error);
    }
  };
}

export function body<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.validated.body as z.infer<T>;
}

export function query<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.validated.query as z.infer<T>;
}

export function params<T extends ZodTypeAny>(req: Request, _schema: T): z.infer<T> {
  return req.validated.params as z.infer<T>;
}