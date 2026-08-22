import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import { env } from "../../config/env.js";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const VERSION = "v1";

function key(): Buffer {
  return Buffer.from(env.ENCRYPTION_KEY, "hex");
}

/**
 * Шифрует секрет канала (токен Telegram-бота).
 * Формат: v1:<iv-base64>:<tag-base64>:<ciphertext-base64>
 */
export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [
    VERSION,
    iv.toString("base64"),
    tag.toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Повреждённый или неизвестный формат зашифрованного секрета");
  }

  const iv = Buffer.from(parts[1] as string, "base64");
  const tag = Buffer.from(parts[2] as string, "base64");
  const ciphertext = Buffer.from(parts[3] as string, "base64");

  const decipher = createDecipheriv(ALGORITHM, key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** Секрет вебхука Telegram: допустимы A-Z, a-z, 0-9, _ и -, длина 1..256. */
export function generateWebhookSecret(): string {
  return randomBytes(32).toString("hex");
}

/** Маскирование токена бота для отображения в админке. */
export function maskBotToken(token: string): string {
  const [botId, secret] = token.split(":");
  if (!botId || !secret) return "***";
  return `${botId}:${secret.slice(0, 3)}***`;
}