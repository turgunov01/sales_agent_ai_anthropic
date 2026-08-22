import { describe, expect, it } from "vitest";
import { parseAmount } from "../../src/core/utils/amount.js";
import { formatPrice, toNumber } from "../../src/core/utils/numbers.js";
import { extractPhone, isValidPhone, normalizePhone } from "../../src/core/utils/phone.js";
import { escapeMarkdownV2, slugify, truncate } from "../../src/core/utils/text.js";

describe("parseAmount", () => {
  it("читает обычные числа и разделители", () => {
    expect(parseAmount("7500000")).toBe(7_500_000);
    expect(parseAmount("7 500 000")).toBe(7_500_000);
    expect(parseAmount("7,500,000")).toBe(7_500_000);
    expect(parseAmount("1.234.567")).toBe(1_234_567);
  });

  it("понимает множители", () => {
    expect(parseAmount("8 млн")).toBe(8_000_000);
    expect(parseAmount("8,5 млн")).toBe(8_500_000);
    expect(parseAmount("12 mln")).toBe(12_000_000);
    expect(parseAmount("500 тыс")).toBe(500_000);
  });

  it("игнорирует валютные подписи", () => {
    expect(parseAmount("7 500 000 сум")).toBe(7_500_000);
    expect(parseAmount("до 8 млн сум")).toBe(8_000_000);
  });

  it("возвращает null, если числа нет", () => {
    expect(parseAmount("цена по запросу")).toBeNull();
    expect(parseAmount("")).toBeNull();
  });
});

describe("телефоны", () => {
  it("нормализует узбекские номера", () => {
    expect(normalizePhone("+998 90 123 45 67")).toBe("+998901234567");
    expect(normalizePhone("998901234567")).toBe("+998901234567");
    expect(normalizePhone("901234567")).toBe("+998901234567");
    expect(normalizePhone("(90) 123-45-67")).toBe("+998901234567");
  });

  it("отвергает мусор", () => {
    expect(normalizePhone("12345")).toBeNull();
    expect(normalizePhone("телефон")).toBeNull();
    expect(isValidPhone("+998901234567")).toBe(true);
  });

  it("находит телефон в тексте сообщения", () => {
    expect(extractPhone("Мой номер 90 123 45 67, звоните")).toBe("+998901234567");
    expect(extractPhone("нет номера")).toBeNull();
  });
});

describe("форматирование", () => {
  it("печатает цену в сумах", () => {
    expect(formatPrice(7_500_000, "UZS")).toBe("7 500 000 сум");
    expect(formatPrice(1200, "USD")).toBe("$1 200");
  });

  it("приводит Decimal-подобные значения к числу", () => {
    expect(toNumber({ toNumber: () => 42 })).toBe(42);
    expect(toNumber("7500000")).toBe(7_500_000);
    expect(toNumber(null)).toBe(0);
  });

  it("обрезает длинный текст", () => {
    expect(truncate("абвгде", 10)).toBe("абвгде");
    expect(truncate("абвгде", 4)).toBe("абв…");
  });

  it("делает slug из кириллицы", () => {
    expect(slugify("Мебель Стиль")).toBe("mebel-stil");
    expect(slugify("!!!")).toBe("company");
  });

  it("экранирует MarkdownV2", () => {
    expect(escapeMarkdownV2("Цена 7.500.000!")).toBe("Цена 7\\.500\\.000\\!");
  });
});