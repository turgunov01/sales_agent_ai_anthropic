import { Router, type Request, type RequestHandler, type Response } from "express";
import { UserRole } from "@ai-sales/shared";
import { badRequest } from "../../core/errors.js";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, noContent, ok } from "../../core/http/respond.js";
import { body, params, query, validate } from "../../core/http/validate.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import {
  createProductSchema,
  importProductsSchema,
  listProductsQuerySchema,
  productIdSchema,
  updateProductSchema,
} from "./products.schema.js";
import type { ProductsService } from "./products.service.js";

/** Импорт принимает и application/json {csv}, и сырое тело text/csv. */
function extractCsv(req: Request): string {
  if (typeof req.body === "string" && req.body.trim().length > 0) return req.body;
  const parsed = importProductsSchema.safeParse(req.body);
  if (!parsed.success) throw badRequest("Ожидается CSV в теле запроса или поле csv");
  return parsed.data.csv;
}

export function createProductsRouter(
  service: ProductsService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);

  const writeAccess = requireRole(UserRole.OWNER, UserRole.ADMIN);

  router.get(
    "/",
    validate({ query: listProductsQuerySchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const result = await service.list(requireAuth(req), query(req, listProductsQuerySchema));
      ok(res, result.items, result.meta);
    }),
  );

  router.get(
    "/categories",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.categories(requireAuth(req)));
    }),
  );

  router.post(
    "/import",
    writeAccess,
    asyncHandler(async (req: Request, res: Response) => {
      const report = await service.importCsv(requireAuth(req), extractCsv(req));
      ok(res, report);
    }),
  );

  router.post(
    "/",
    writeAccess,
    validate({ body: createProductSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      created(res, await service.create(requireAuth(req), body(req, createProductSchema)));
    }),
  );

  router.get(
    "/:id",
    validate({ params: productIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, productIdSchema);
      ok(res, await service.get(requireAuth(req), id));
    }),
  );

  router.patch(
    "/:id",
    writeAccess,
    validate({ params: productIdSchema, body: updateProductSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, productIdSchema);
      ok(res, await service.update(requireAuth(req), id, body(req, updateProductSchema)));
    }),
  );

  router.delete(
    "/:id",
    writeAccess,
    validate({ params: productIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, productIdSchema);
      await service.remove(requireAuth(req), id);
      noContent(res);
    }),
  );

  return router;
}