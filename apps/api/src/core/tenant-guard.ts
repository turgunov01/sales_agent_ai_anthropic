import { TenantScopeError } from "./errors.js";

/**
 * Модели, каждая строка которых принадлежит конкретной компании.
 * Company отсутствует намеренно: это сам корень арендатора.
 * Session отсутствует намеренно: сессия скоупится по userId.
 */
export const TENANT_MODELS = new Set([
  "User",
  "Product",
  "KnowledgeBase",
  "FaqItem",
  "AiSettings",
  "Channel",
  "Customer",
  "Conversation",
  "Message",
  "Lead",
  "LeadEvent",
]);

const WHERE_SCOPED_OPERATIONS = new Set([
  "findFirst",
  "findFirstOrThrow",
  "findMany",
  "findUnique",
  "findUniqueOrThrow",
  "count",
  "aggregate",
  "groupBy",
  "update",
  "updateMany",
  "delete",
  "deleteMany",
]);

const DATA_SCOPED_OPERATIONS = new Set(["create", "createMany", "createManyAndReturn"]);

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasCompanyScope(node: unknown): boolean {
  if (!isRecord(node)) return false;
  if (node.companyId !== undefined && node.companyId !== null) return true;
  if (isRecord(node.company)) return true;

  // Составной уникальный ключ: where: { companyId_externalId: { companyId, externalId } }
  for (const [key, value] of Object.entries(node)) {
    if (key.startsWith("companyId_") && isRecord(value) && value.companyId !== undefined) {
      return true;
    }
  }

  // Логические комбинаторы: AND/OR должны иметь companyId в каждой ветке.
  const and = node.AND;
  if (Array.isArray(and) && and.some(hasCompanyScope)) return true;
  if (isRecord(and) && hasCompanyScope(and)) return true;

  const or = node.OR;
  if (Array.isArray(or) && or.length > 0 && or.every(hasCompanyScope)) return true;

  return false;
}

/**
 * Бросает TenantScopeError, если операция над моделью арендатора
 * не ограничена companyId. Чистая функция — тестируется отдельно.
 */
export function assertTenantScope(
  model: string | undefined,
  operation: string,
  args: unknown,
): void {
  if (!model || !TENANT_MODELS.has(model)) return;

  const payload = isRecord(args) ? args : {};

  if (DATA_SCOPED_OPERATIONS.has(operation)) {
    const data = payload.data;
    const rows = Array.isArray(data) ? data : [data];
    const everyRowScoped = rows.length > 0 && rows.every((row) => hasCompanyScope(row));
    if (!everyRowScoped) throw new TenantScopeError(model, operation);
    return;
  }

  if (operation === "upsert") {
    if (!hasCompanyScope(payload.where) || !hasCompanyScope(payload.create)) {
      throw new TenantScopeError(model, operation);
    }
    return;
  }

  if (WHERE_SCOPED_OPERATIONS.has(operation)) {
    if (!hasCompanyScope(payload.where)) throw new TenantScopeError(model, operation);
    return;
  }
}