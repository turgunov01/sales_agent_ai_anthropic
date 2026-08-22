import type { Request, Response } from "express";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, ok } from "../../core/http/respond.js";
import { body } from "../../core/http/validate.js";
import type { AuthService, RequestMeta } from "./auth.service.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";
import { requireAuth } from "./auth.middleware.js";

function meta(req: Request): RequestMeta {
  return {
    userAgent: req.header("user-agent") ?? null,
    ip: req.ip ?? null,
  };
}

export function createAuthController(service: AuthService) {
  return {
    register: asyncHandler(async (req: Request, res: Response) => {
      const result = await service.register(body(req, registerSchema), meta(req));
      created(res, result);
    }),

    login: asyncHandler(async (req: Request, res: Response) => {
      const result = await service.login(body(req, loginSchema), meta(req));
      ok(res, result);
    }),

    refresh: asyncHandler(async (req: Request, res: Response) => {
      const input = body(req, refreshSchema);
      const tokens = await service.refresh(input.refreshToken, meta(req));
      ok(res, tokens);
    }),

    logout: asyncHandler(async (req: Request, res: Response) => {
      const input = body(req, refreshSchema);
      await service.logout(input.refreshToken);
      ok(res, { loggedOut: true });
    }),

    me: asyncHandler(async (req: Request, res: Response) => {
      const result = await service.me(requireAuth(req));
      ok(res, result);
    }),
  };
}