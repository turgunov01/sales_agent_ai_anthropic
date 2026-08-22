import cors from "cors";
import express, { type Express } from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import type { AppContainer } from "./container.js";
import { errorHandler, notFoundHandler } from "./core/http/error-handler.js";
import { requestContext } from "./core/http/request-context.js";
import { apiRateLimit } from "./core/security/rate-limit.js";
import { createApiRouter } from "./routes.js";
import { createHealthRouter } from "./modules/health/health.routes.js";

export interface CreateAppOptions {
  container: AppContainer;
  checkDatabase?: () => Promise<boolean>;
}

export function createApp({ container, checkDatabase }: CreateAppOptions): Express {
  const app = express();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(helmet({ contentSecurityPolicy: env.isProduction ? undefined : false }));
  app.use(
    cors({
      origin: env.corsOrigins.length > 0 ? env.corsOrigins : false,
      credentials: false,
      methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
    }),
  );

  app.use(requestContext);
  // CSV-импорт приходит сырым телом; всё остальное — JSON.
  app.use(express.text({ type: ["text/csv", "text/plain"], limit: "5mb" }));
  app.use(express.json({ limit: "1mb" }));

  app.use("/health", createHealthRouter(checkDatabase));
  app.use("/api/v1", apiRateLimit, createApiRouter(container));

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}