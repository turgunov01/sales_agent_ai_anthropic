import { Router, type Request, type RequestHandler, type Response } from "express";
import { UserRole } from "@ai-sales/shared";
import { asyncHandler } from "../../core/http/async-handler.js";
import { created, noContent, ok } from "../../core/http/respond.js";
import { body, params, validate } from "../../core/http/validate.js";
import { requireAuth, requireRole } from "../auth/auth.middleware.js";
import {
  createEmployeeSchema,
  employeeIdSchema,
  updateEmployeeSchema,
} from "./employees.schema.js";
import type { EmployeesService } from "./employees.service.js";

export function createEmployeesRouter(
  service: EmployeesService,
  authenticate: RequestHandler,
): Router {
  const router = Router();
  router.use(authenticate);

  router.get(
    "/",
    asyncHandler(async (req: Request, res: Response) => {
      ok(res, await service.list(requireAuth(req)));
    }),
  );

  router.post(
    "/",
    requireRole(UserRole.OWNER, UserRole.ADMIN),
    validate({ body: createEmployeeSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      created(res, await service.create(requireAuth(req), body(req, createEmployeeSchema)));
    }),
  );

  router.patch(
    "/:id",
    requireRole(UserRole.OWNER, UserRole.ADMIN),
    validate({ params: employeeIdSchema, body: updateEmployeeSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, employeeIdSchema);
      ok(res, await service.update(requireAuth(req), id, body(req, updateEmployeeSchema)));
    }),
  );

  router.delete(
    "/:id",
    requireRole(UserRole.OWNER),
    validate({ params: employeeIdSchema }),
    asyncHandler(async (req: Request, res: Response) => {
      const { id } = params(req, employeeIdSchema);
      await service.remove(requireAuth(req), id);
      noContent(res);
    }),
  );

  return router;
}