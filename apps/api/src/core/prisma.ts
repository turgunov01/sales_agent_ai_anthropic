import { PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";
import { logger } from "./logger.js";
import { assertTenantScope } from "./tenant-guard.js";

let base: PrismaClient | undefined;
let guarded: GuardedDatabase | undefined;

function getBaseClient(): PrismaClient {
  if (!base) {
    base = new PrismaClient({
      log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }
  return base;
}

function withTenantGuard(client: PrismaClient) {
  return client.$extends({
    name: "tenant-guard",
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          assertTenantScope(model, operation, args);
          return query(args);
        },
      },
    },
  });
}

export type GuardedDatabase = ReturnType<typeof withTenantGuard>;

/**
 * Клиент по умолчанию: любая операция над данными арендатора
 * без companyId завершится TenantScopeError.
 */
export function getPrisma(): GuardedDatabase {
  if (!guarded) guarded = withTenantGuard(getBaseClient());
  return guarded;
}

/**
 * Клиент без guard-расширения. Разрешён ровно в двух местах, где арендатор
 * ещё не определён и определяется как раз этим запросом:
 *   1) поиск пользователя по глобально уникальному email при входе;
 *   2) поиск канала по channelId при приёме вебхука Telegram.
 * Любое другое использование — дефект. См. docs/07-security-model.md.
 */
export function getTenantResolutionPrisma(): PrismaClient {
  return getBaseClient();
}

export async function disconnectPrisma(): Promise<void> {
  if (!base) return;
  await base.$disconnect();
  base = undefined;
  guarded = undefined;
  logger.info("Соединение с базой данных закрыто");
}