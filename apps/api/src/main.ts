import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { createContainer } from "./container.js";
import { logger } from "./core/logger.js";
import { disconnectPrisma, getPrisma } from "./core/prisma.js";
import { backgroundQueue } from "./core/queue/in-process-queue.js";

async function checkDatabase(): Promise<boolean> {
  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ err: error }, "Проверка соединения с базой данных не прошла");
    return false;
  }
}

function bootstrap(): void {
  const container = createContainer();
  const app = createApp({ container, checkDatabase });

  const server = app.listen(env.PORT, env.HOST, () => {
    logger.info(
      { host: env.HOST, port: env.PORT, env: env.NODE_ENV, aiEnabled: env.aiEnabled },
      "AI Sales Manager API запущен",
    );
    if (!env.aiEnabled) {
      logger.warn("ANTHROPIC_API_KEY не задан: AI-ассистент работает в режиме деградации");
    }
  });

  const shutdown = (signal: string): void => {
    logger.info({ signal }, "Останавливаю сервер");
    server.close(() => {
      void backgroundQueue
        .whenIdle()
        .then(() => disconnectPrisma())
        .finally(() => process.exit(0));
    });
    setTimeout(() => process.exit(1), 15_000).unref();
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error({ err: reason }, "Необработанное отклонение промиса");
  });
}

bootstrap();