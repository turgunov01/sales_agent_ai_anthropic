/**
 * Нормализация узбекского номера к формату +998XXXXXXXXX.
 * Принимает: +998 90 123 45 67, 998901234567, 901234567, (90) 123-45-67.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.length === 0) return null;

  if (digits.length === 12 && digits.startsWith("998")) return `+${digits}`;
  if (digits.length === 9) return `+998${digits}`;
  if (digits.length === 13 && digits.startsWith("8998")) return `+${digits.slice(1)}`;

  // Международные номера принимаем как есть, если длина правдоподобна.
  if (digits.length >= 10 && digits.length <= 15) return `+${digits}`;

  return null;
}

export function isValidPhone(input: string): boolean {
  return normalizePhone(input) !== null;
}

/** Ищет телефон в свободном тексте сообщения клиента. */
export function extractPhone(text: string): string | null {
  const candidates = text.match(/(\+?\d[\d\s\-()]{7,17}\d)/g);
  if (!candidates) return null;
  for (const candidate of candidates) {
    const normalized = normalizePhone(candidate);
    if (normalized) return normalized;
  }
  return null;
}