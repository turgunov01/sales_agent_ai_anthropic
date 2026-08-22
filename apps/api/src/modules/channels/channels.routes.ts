import { Router, type Request, type RequestHandler, type Response } from "express";
import { UserRole } from "@ai-sales/shared";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, noContent, ok } from "../../core/http/respond.js";
import { body, params, validate } from "../../core/http/validate.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import { channelIdSchema, connectTelegramSchema } from "./channels.schema.js";
import type { ChannelsService } from "./channels.service.js";

export function createChannelsRouter(
  service: ChannelsService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);

  const writeAccess = requireRole(UserRole.OWNER, UserRole.ADMIN);

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.list(requireAuth(req)));
    }),
  );

  router.post(
    "/telegram",
    writeAccess,
    validate({ body: connectTelegramSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { botToken } = body(req, connectTelegramSchema);
      created(res, await service.connectTelegram(requireAuth(req), botToken));
    }),
  );

  router.post(
    "/telegram/verify",
    writeAccess,
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.verifyTelegram(requireAuth(req)));
    }),
  );

  router.delete(
    "/:id",
    writeAccess,
    validate({ params: channelIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, channelIdSchema);
      await service.disconnect(requireAuth(req), id);
      noContent(res);
    }),
  );

  return router;
}