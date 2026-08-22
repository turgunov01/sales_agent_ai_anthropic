import { describe, expect, it } from "vitest";
import { Language } from "@ai-sales/shared";
import { detectLanguage } from "../../src/modules/ai/language.js";

describe("detectLanguage", () => {
  it("определяет русский по маркерам", () => {
    expect(detectLanguage("Мне нужен диван до 8 млн")).toBe(Language.RU);
    expect(detectLanguage("Сколько стоит шкаф?")).toBe(Language.RU);
    expect(detectLanguage("Здравствуйте, есть доставка?")).toBe(Language.RU);
  });

  it("определяет узбекский на латинице", () => {
    expect(detectLanguage("Menga divan kerak, narxi qancha?")).toBe(Language.UZ);
    expect(detectLanguage("Salom, shkaf bormi?")).toBe(Language.UZ);
  });

  it("определяет узбекскую кириллицу по уникальным буквам", () => {
    expect(detectLanguage("Менга диван керак, нархи қанча?")).toBe(Language.UZ);
  });

  it("использует запасной язык, когда букв нет", () => {
    expect(detectLanguage("12345 !!!", Language.UZ)).toBe(Language.UZ);
    expect(detectLanguage("", Language.RU)).toBe(Language.RU);
  });

  it("считает латиницу без маркеров узбекским", () => {
    expect(detectLanguage("stol stul")).toBe(Language.UZ);
  });

  it("не путает русский текст с узбекским из-за одной латинской буквы", () => {
    expect(detectLanguage("Нужен диван 3D модель")).toBe(Language.RU);
  });
});