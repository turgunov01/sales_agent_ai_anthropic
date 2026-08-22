import { Router, type Request, type RequestHandler, type Response } from "express";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, ok } from "../../core/http/respond.js";
import { body, params, query, validate } from "../../core/http/validate.js";
import { requireAuth } from "../auth/auth.middleware.js";
import {
  assignLeadSchema,
  changeStatusSchema,
  createLeadSchema,
  leadIdSchema,
  listLeadsQuerySchema,
  updateLeadSchema,
} from "./leads.schema.js";
import type { LeadsService } from "./leads.service.js";

export function createLeadsRouter(service: LeadsService, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    "/",
    validate({ query: listLeadsQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.list(requireAuth(req), query(req, listLeadsQuerySchema));
      ok(res, result.items, result.meta);
    }),
  );

  router.post(
    "/",
    validate({ body: createLeadSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      created(res, await service.create(requireAuth(req), body(req, createLeadSchema)));
    }),
  );

  router.get(
    "/:id",
    validate({ params: leadIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, leadIdSchema);
      ok(res, await service.get(requireAuth(req), id));
    }),
  );

  router.patch(
    "/:id",
    validate({ params: leadIdSchema, body: updateLeadSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, leadIdSchema);
      ok(res, await service.update(requireAuth(req), id, body(req, updateLeadSchema)));
    }),
  );

  router.post(
    "/:id/status",
    validate({ params: leadIdSchema, body: changeStatusSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, leadIdSchema);
      ok(res, await service.changeStatus(requireAuth(req), id, body(req, changeStatusSchema)));
    }),
  );

  router.post(
    "/:id/assign",
    validate({ params: leadIdSchema, body: assignLeadSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, leadIdSchema);
      const { managerId } = body(req, assignLeadSchema);
      ok(res, await service.assign(requireAuth(req), id, managerId));
    }),
  );

  return router;
}