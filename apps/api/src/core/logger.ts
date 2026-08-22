import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: "ai-sales-api" },
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-telegram-bot-api-secret-token']",
      "botToken",
      "password",
      "passwordHash",
      "refreshToken",
      "refreshTokenHash",
      "botTokenCiphertext",
      "webhookSecret",
      "ENCRYPTION_KEY",
      "ANTHROPIC_API_KEY",
    ],
    censor: "[redacted]",
  },
  transport:
    env.NODE_ENV === "development"
      ? { target: "pino/file", options: { destination: 1 } }
      : undefined,
});

export type Logger = typeof logger;