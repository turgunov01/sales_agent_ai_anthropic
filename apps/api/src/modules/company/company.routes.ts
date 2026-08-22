import { Router, type Request, type RequestHandler, type Response } from "express";
import { UserRole } from "@ai-sales/shared";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, noContent, ok } from "../../core/http/respond.js";
import { body, params, validate } from "../../core/http/validate.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import {
  createFaqSchema,
  faqIdSchema,
  updateAiSettingsSchema,
  updateCompanySchema,
  updateFaqSchema,
  updateKnowledgeSchema,
} from "./company.schema.js";
import type { CompanyService } from "./company.service.js";

export function createCompanyRouter(
  service: CompanyService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);

  const writeAccess = requireRole(UserRole.OWNER, UserRole.ADMIN);

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.getProfile(requireAuth(req)));
    }),
  );

  router.patch(
    "/",
    writeAccess,
    validate({ body: updateCompanySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.updateProfile(requireAuth(req), body(req, updateCompanySchema)));
    }),
  );

  router.get(
    "/knowledge",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.getKnowledge(requireAuth(req)));
    }),
  );

  router.put(
    "/knowledge",
    writeAccess,
    validate({ body: updateKnowledgeSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.updateKnowledge(requireAuth(req), body(req, updateKnowledgeSchema)));
    }),
  );

  router.get(
    "/faq",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.listFaq(requireAuth(req)));
    }),
  );

  router.post(
    "/faq",
    writeAccess,
    validate({ body: createFaqSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      created(res, await service.createFaq(requireAuth(req), body(req, createFaqSchema)));
    }),
  );

  router.patch(
    "/faq/:id",
    writeAccess,
    validate({ params: faqIdSchema, body: updateFaqSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, faqIdSchema);
      ok(res, await service.updateFaq(requireAuth(req), id, body(req, updateFaqSchema)));
    }),
  );

  router.delete(
    "/faq/:id",
    writeAccess,
    validate({ params: faqIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, faqIdSchema);
      await service.deleteFaq(requireAuth(req), id);
      noContent(res);
    }),
  );

  router.get(
    "/ai-settings",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.getAiSettings(requireAuth(req)));
    }),
  );

  router.put(
    "/ai-settings",
    writeAccess,
    validate({ body: updateAiSettingsSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.updateAiSettings(requireAuth(req), body(req, updateAiSettingsSchema)));
    }),
  );

  return router;
}