/**
 * Множители ищутся строго в хвосте после числа: иначе латинская "k"
 * сработала бы внутри любого слова (например, "kerak").
 * \b здесь неприменим — в JS границы слова не знают о кириллице.
 */
const MULTIPLIERS: Array<{ pattern: RegExp; factor: number }> = [
  { pattern: /^(млн|миллион\w*|mln|million|mil)/i, factor: 1_000_000 },
  { pattern: /^(тыс\.?|тысяч\w*|ming|thousand)/i, factor: 1_000 },
  { pattern: /^k(?![a-z])/i, factor: 1_000 },
];

/**
 * Разбор денежной суммы из свободного текста: "7 500 000", "7,5 млн",
 * "8000000 сум", "8 mln". Возвращает null, если числа нет.
 * Используется и в CSV-импорте, и при разборе бюджета клиента.
 */
export function parseAmount(input: string): number | null {
  if (typeof input !== "string") return null;
  const normalized = input.replace(/\u00A0/g, " ").trim();
  if (normalized.length === 0) return null;

  const numberMatch = normalized.match(/-?\d[\d\s.,]*/);
  if (!numberMatch || numberMatch.index === undefined) return null;

  let digits = numberMatch[0].replace(/\s/g, "");

  const hasComma = digits.includes(",");
  const hasDot = digits.includes(".");

  if (hasComma && hasDot) {
    // Последний разделитель считаем десятичным: 1.234,56 и 1,234.56
    digits =
      digits.lastIndexOf(",") > digits.lastIndexOf(".")
        ? digits.replace(/\./g, "").replace(",", ".")
        : digits.replace(/,/g, "");
  } else if (hasComma) {
    const parts = digits.split(",");
    const last = parts[parts.length - 1] ?? "";
    digits =
      parts.length === 2 && last.length <= 2 ? digits.replace(",", ".") : digits.replace(/,/g, "");
  } else if (hasDot) {
    const parts = digits.split(".");
    const last = parts[parts.length - 1] ?? "";
    if (!(parts.length === 2 && last.length <= 2)) digits = digits.replace(/\./g, "");
  }

  const value = Number(digits);
  if (!Number.isFinite(value)) return null;

  const tail = normalized.slice(numberMatch.index + numberMatch[0].length).trimStart();
  for (const { pattern, factor } of MULTIPLIERS) {
    if (pattern.test(tail)) return Math.round(value * factor);
  }

  return value;
}