import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

const REQUEST_ID_HEADER = "x-request-id";
const UUID_PATTERN = /^[0-9a-zA-Z-]{8,64}$/;

export function requestContext(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  req.requestId = incoming && UUID_PATTERN.test(incoming) ? incoming : randomUUID();
  req.validated = {};
  res.setHeader(REQUEST_ID_HEADER, req.requestId);
  next();
}