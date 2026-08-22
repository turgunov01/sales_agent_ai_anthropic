import type { Currency, LeadStatus } from "@ai-sales/shared";

const CURRENCY_LABEL: Record<string, string> = { UZS: "сум", USD: "$" };

export function formatPrice(amount: number | null, currency: Currency | string = "UZS"): string {
  if (amount === null || Number.isNaN(amount)) return "—";
  const grouped = Math.round(amount).toLocaleString("ru-RU").replace(/\u00A0/g, " ");
  const label = CURRENCY_LABEL[currency] ?? currency;
  return currency === "USD" ? `${label}${grouped}` : `${grouped} ${label}`;
}

export function formatBudget(
  min: number | null,
  max: number | null,
  currency: Currency | string = "UZS",
): string {
  if (min === null && max === null) return "—";
  if (min !== null && max !== null) return `${formatPrice(min, currency)} – ${formatPrice(max, currency)}`;
  if (max !== null) return `до ${formatPrice(max, currency)}`;
  return `от ${formatPrice(min, currency)}`;
}

export function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatRelative(value: string | null): string {
  if (!value) return "—";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return "только что";
  if (minutes < 60) return `${minutes} мин назад`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ч назад`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days} дн назад`;
  return formatDateTime(value);
}

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  NEW: "Новый",
  QUALIFIED: "Квалифицирован",
  CONTACTED: "На связи",
  WON: "Продажа",
  LOST: "Отказ",
};

export const CONVERSATION_STATUS_LABEL: Record<string, string> = {
  ACTIVE: "AI ведёт",
  HANDOFF_REQUESTED: "Нужен менеджер",
  HUMAN_HANDLING: "Менеджер ведёт",
  CLOSED: "Закрыт",
};

export const STOCK_LABEL: Record<string, string> = {
  IN_STOCK: "В наличии",
  OUT_OF_STOCK: "Нет в наличии",
  ON_ORDER: "Под заказ",
};

export const ROLE_LABEL: Record<string, string> = {
  OWNER: "Владелец",
  ADMIN: "Администратор",
  MANAGER: "Менеджер",
};

export function customerName(customer: {
  firstName: string | null;
  lastName: string | null;
  username: string | null;
}): string {
  const parts = [customer.firstName, customer.lastName].filter(Boolean);
  if (parts.length > 0) return parts.join(" ");
  if (customer.username) return `@${customer.username}`;
  return "Клиент Telegram";
}