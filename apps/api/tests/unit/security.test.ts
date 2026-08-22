import { describe, expect, it } from "vitest";
import {
  decryptSecret,
  encryptSecret,
  generateWebhookSecret,
  maskBotToken,
} from "../../src/core/security/crypto.js";
import { hashPassword, verifyPassword } from "../../src/core/security/password.js";
import {
  generateRefreshToken,
  hashRefreshToken,
  safeCompare,
  signAccessToken,
  verifyAccessToken,
} from "../../src/core/security/tokens.js";

describe("пароли (scrypt)", () => {
  it("проверяет верный пароль и отвергает неверный", async () => {
    const hash = await hashPassword("Demo12345!");
    expect(hash.startsWith("scrypt$")).toBe(true);
    await expect(verifyPassword("Demo12345!", hash)).resolves.toBe(true);
    await expect(verifyPassword("Demo12345", hash)).resolves.toBe(false);
  });

  it("даёт разные хэши для одного пароля (соль)", async () => {
    const first = await hashPassword("Demo12345!");
    const second = await hashPassword("Demo12345!");
    expect(first).not.toBe(second);
  });

  it("не падает на повреждённом хэше", async () => {
    await expect(verifyPassword("Demo12345!", "мусор")).resolves.toBe(false);
    await expect(verifyPassword("Demo12345!", "scrypt$a$b$c$d$e")).resolves.toBe(false);
  });
});

describe("токены", () => {
  const context = { userId: "usr_1", companyId: "cmp_1", role: "OWNER" as const };

  it("подписывает и проверяет access-токен", () => {
    const token = signAccessToken(context);
    expect(verifyAccessToken(token)).toEqual(context);
  });

  it("отклоняет подделанный токен", () => {
    const token = signAccessToken(context);
    expect(() => verifyAccessToken(`${token}x`)).toThrow();
    expect(() => verifyAccessToken("не.токен.вовсе")).toThrow();
  });

  it("refresh-токен хранится только хэшем", () => {
    const { token, hash } = generateRefreshToken();
    expect(token).not.toBe(hash);
    expect(hashRefreshToken(token)).toBe(hash);
  });

  it("safeCompare сравнивает строки корректно", () => {
    expect(safeCompare("secret", "secret")).toBe(true);
    expect(safeCompare("secret", "secreT")).toBe(false);
    expect(safeCompare("secret", "longer-secret")).toBe(false);
  });
});

describe("шифрование секретов каналов", () => {
  it("шифрует и расшифровывает токен бота", () => {
    const token = "123456789:AAEhBOweik6ad9r_ZeuFRFF-DEMOtokenXYZ";
    const encrypted = encryptSecret(token);
    expect(encrypted).not.toContain(token);
    expect(encrypted.startsWith("v1:")).toBe(true);
    expect(decryptSecret(encrypted)).toBe(token);
  });

  it("даёт разный шифротекст при каждом вызове", () => {
    expect(encryptSecret("одно и то же")).not.toBe(encryptSecret("одно и то же"));
  });

  it("отклоняет повреждённые данные", () => {
    const encrypted = encryptSecret("секрет");
    const parts = encrypted.split(":");
    const tampered = [parts[0], parts[1], parts[2], "AAAA"].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
    expect(() => decryptSecret("мусор")).toThrow();
  });

  it("маскирует токен для отображения", () => {
    expect(maskBotToken("123456789:AAEhBOweik6ad9r")).toBe("123456789:AAE***");
    expect(maskBotToken("без-двоеточия")).toBe("***");
  });

  it("генерирует секрет вебхука допустимого формата", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
  });
});