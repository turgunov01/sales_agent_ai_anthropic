import type { Response } from "express";
import type { ApiSuccess, PaginationMeta } from "@ai-sales/shared";

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  return {
    page,
    limit,
    total,
    totalPages: limit > 0 ? Math.ceil(total / limit) : 0,
  };
}

export function ok<T>(res: Response, data: T, meta?: PaginationMeta): Response {
  const body: ApiSuccess<T> = meta ? { success: true, data, meta } : { success: true, data };
  return res.status(200).json(body);
}

export function created<T>(res: Response, data: T): Response {
  const body: ApiSuccess<T> = { success: true, data };
  return res.status(201).json(body);
}

export function noContent(res: Response): Response {
  return res.status(204).send();
}