import { Router, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, ok } from "../../core/http/respond.js";
import { body, params, query, validate } from "../../core/http/validate.js";
import { authRateLimit } from "../../core/security/rate-limit.js";
import {
  companyIdSchema,
  createCompanySchema,
  listCompaniesQuerySchema,
  platformLoginSchema,
  platformRefreshSchema,
  setStatusSchema,
} from "./platform.schema.js";
import { requirePlatformAdmin } from "./platform.middleware.js";
import type { PlatformService } from "./platform.service.js";

const auditQuerySchema = z.object({ limit: z.coerce.number().int().min(1).max(200).default(50) });

function meta(req: Request) {
  return { userAgent: req.header("user-agent") ?? null, ip: req.ip ?? null };
}

export function createPlatformRouter(
  service: PlatformService,
  authenticate: RequestHandler,
): Router {
  const router = Router();

  router.post(
    "/auth/login",
    authRateLimit,
    validate({ body: platformLoginSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.login(body(req, platformLoginSchema), meta(req)));
    }),
  );

  router.post(
    "/auth/refresh",
    validate({ body: platformRefreshSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { refreshToken } = body(req, platformRefreshSchema);
      ok(res, await service.refresh(refreshToken, meta(req)));
    }),
  );

  router.post(
    "/auth/logout",
    validate({ body: platformRefreshSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      await service.logout(body(req, platformRefreshSchema).refreshToken);
      ok(res, { loggedOut: true });
    }),
  );

  router.use(authenticate);

  router.get(
    "/auth/me",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.me(requirePlatformAdmin(req)));
    }),
  );

  router.get(
    "/companies",
    validate({ query: listCompaniesQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.listCompanies(query(req, listCompaniesQuerySchema));
      ok(res, result.items, result.meta);
    }),
  );

  router.post(
    "/companies",
    validate({ body: createCompanySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const admin = requirePlatformAdmin(req);
      created(res, await service.createCompany(admin, body(req, createCompanySchema), req.ip ?? null));
    }),
  );

  router.get(
    "/companies/:id",
    validate({ params: companyIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.getCompany(params(req, companyIdSchema).id));
    }),
  );

  router.post(
    "/companies/:id/status",
    validate({ params: companyIdSchema, body: setStatusSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const admin = requirePlatformAdmin(req);
      const { id } = params(req, companyIdSchema);
      ok(res, await service.setStatus(admin, id, body(req, setStatusSchema), req.ip ?? null));
    }),
  );

  router.get(
    "/audit",
    validate({ query: auditQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.auditLog(query(req, auditQuerySchema).limit));
    }),
  );

  return router;
}