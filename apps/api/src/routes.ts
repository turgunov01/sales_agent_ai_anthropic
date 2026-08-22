import { Router } from "express";
import { env } from "./config/env.js";
import type { AppContainer } from "./container.js";
import { createAnalyticsRouter } from "./modules/analytics/analytics.routes.js";
import { createAuthRouter } from "./modules/auth/auth.routes.js";
import { createChannelsRouter } from "./modules/channels/channels.routes.js";
import { createWebhookRouter } from "./modules/channels/webhook.routes.js";
import { createCompanyRouter } from "./modules/company/company.routes.js";
import { createConversationsRouter } from "./modules/conversations/conversations.routes.js";
import { createEmployeesRouter } from "./modules/employees/employees.routes.js";
import { createLeadsRouter } from "./modules/leads/leads.routes.js";
import { createPlatformRouter } from "./modules/platform/platform.routes.js";
import { createProductsRouter } from "./modules/products/products.routes.js";

export function createApiRouter(container: AppContainer): Router {
  const router = Router();
  const { services, authenticate, repos, queue } = container;

  router.use("/auth", createAuthRouter(services.auth, authenticate));
  router.use("/company", createCompanyRouter(services.company, authenticate));
  router.use("/employees", createEmployeesRouter(services.employees, authenticate));
  router.use("/products", createProductsRouter(services.products, authenticate));
  router.use("/conversations", createConversationsRouter(services.conversations, authenticate));
  router.use("/leads", createLeadsRouter(services.leads, authenticate));
  router.use("/channels", createChannelsRouter(services.channels, authenticate));
  router.use("/analytics", createAnalyticsRouter(services.analytics, authenticate));
  // Платформенная админка монтируется, только если задан отдельный секрет.
  if (env.platformEnabled) {
    router.use("/platform", createPlatformRouter(services.platform, container.platformAuthenticate));
  }

  router.use("/webhooks", createWebhookRouter(repos, services.dispatcher, queue));

  return router;
}