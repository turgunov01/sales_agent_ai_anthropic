import { Router, type Request, type RequestHandler, type Response } from "express";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, ok } from "../../core/http/respond.js";
import { body, params, query, validate } from "../../core/http/validate.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  conversationIdSchema,
  listConversationsQuerySchema,
  listMessagesQuerySchema,
  sendMessageSchema,
} from "./conversations.schema.js";
import type { ConversationsService } from "./conversations.service.js";

export function createConversationsRouter(
  service: ConversationsService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    "/",
    validate({ query: listConversationsQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.list(requireAuth(req), query(req, listConversationsQuerySchema));
      ok(res, result.items, result.meta);
    }),
  );

  router.get(
    "/:id",
    validate({ params: conversationIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, conversationIdSchema);
      ok(res, await service.get(requireAuth(req), id));
    }),
  );

  router.get(
    "/:id/messages",
    validate({ params: conversationIdSchema, query: listMessagesQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, conversationIdSchema);
      const { limit } = query(req, listMessagesQuerySchema);
      ok(res, await service.listMessages(requireAuth(req), id, limit));
    }),
  );

  router.post(
    "/:id/messages",
    validate({ params: conversationIdSchema, body: sendMessageSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, conversationIdSchema);
      const { text } = body(req, sendMessageSchema);
      created(res, await service.sendManagerMessage(requireAuth(req), id, text));
    }),
  );

  router.post(
    "/:id/takeover",
    validate({ params: conversationIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, conversationIdSchema);
      ok(res, await service.takeover(requireAuth(req), id));
    }),
  );

  router.post(
    "/:id/release",
    validate({ params: conversationIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, conversationIdSchema);
      ok(res, await service.release(requireAuth(req), id));
    }),
  );

  router.post(
    "/:id/close",
    validate({ params: conversationIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, conversationIdSchema);
      ok(res, await service.close(requireAuth(req), id));
    }),
  );

  return router;
}