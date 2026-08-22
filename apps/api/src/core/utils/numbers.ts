/**
 * Prisma отдаёт Decimal-объект; наружу мы всегда отдаём number.
 * Функция принимает Decimal, строку или число и не зависит от типов Prisma.
 */
export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  if (typeof value === "object" && value !== null && "toNumber" in value) {
    const candidate = (value as { toNumber: () => number }).toNumber();
    return Number.isFinite(candidate) ? candidate : 0;
  }
  return 0;
}

export function toNullableNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return toNumber(value);
}

const CURRENCY_LABELS: Record<string, string> = { UZS: "сум", USD: "$" };

/** Формат цены для сообщений клиенту: 7 500 000 сум. */
export function formatPrice(amount: number, currency: string): string {
  const rounded = Math.round(amount);
  const grouped = rounded.toLocaleString("ru-RU").replace(/\u00A0/g, " ");
  const label = CURRENCY_LABELS[currency] ?? currency;
  return currency === "USD" ? `${label}${grouped}` : `${grouped} ${label}`;
}