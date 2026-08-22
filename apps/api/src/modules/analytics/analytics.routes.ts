import { Router, type Request, type RequestHandler, type Response } from "express";
import { z } from "zod";
import { asyncHandler } from "../../core/http/async-handler.js";
import { ok } from "../../core/http/respond.js";
import { query, validate } from "../../core/http/validate.js";
import { requireAuth } from "../auth/auth.middleware.js";
import type { AnalyticsService } from "./analytics.service.js";

const overviewQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).default(30),
});

export function createAnalyticsRouter(
  service: AnalyticsService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    "/overview",
    validate({ query: overviewQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { days } = query(req, overviewQuerySchema);
      ok(res, await service.overview(requireAuth(req), days));
    }),
  );

  return router;
}