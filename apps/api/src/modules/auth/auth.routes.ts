import { Router, type RequestHandler } from "express";
import { validate } from "../../core/http/validate.js";
import { authRateLimit } from "../../core/security/rate-limit.js";
import { createAuthController } from "./auth.controller.js";
import { loginSchema, refreshSchema, registerSchema } from "./auth.schema.js";
import type { AuthService } from "./auth.service.js";

export function createAuthRouter(service: AuthService, authenticate: RequestHandler): Router {
  const router = Router();
  const controller = createAuthController(service);

  router.post("/register", authRateLimit, validate({ body: registerSchema }), controller.register);
  router.post("/login", authRateLimit, validate({ body: loginSchema }), controller.login);
  router.post("/refresh", validate({ body: refreshSchema }), controller.refresh);
  router.post("/logout", validate({ body: refreshSchema }), controller.logout);
  router.get("/me", authenticate, controller.me);

  return router;
}