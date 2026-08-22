import type { NextFunction, Request, RequestHandler, Response } from "express";

/**
 * Express 4 не ловит отклонённые промисы в обработчиках.
 * Все асинхронные контроллеры оборачиваются этой функцией.
 */
export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>,
): RequestHandler {
  return (req, res, next) => {
    handler(req, res, next).catch(next);
  };
}