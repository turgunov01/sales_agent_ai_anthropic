import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const durationPattern = /^\d+(ms|s|m|h|d)$/;

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  // За обратным прокси API не должен слушать внешний интерфейс.
  // 0.0.0.0 нужен только внутри контейнера.
  HOST: z.string().min(1).default("0.0.0.0"),
  APP_URL: z.string().url().default("http://localhost:4000"),
  WEB_ORIGIN: z.string().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),

  DATABASE_URL: z.string().min(1, "DATABASE_URL обязателен"),

  JWT_ACCESS_SECRET: z.string().min(32, "JWT_ACCESS_SECRET должен быть не короче 32 символов"),
  JWT_REFRESH_SECRET: z.string().min(32, "JWT_REFRESH_SECRET должен быть не короче 32 символов"),
  ACCESS_TOKEN_TTL: z.string().regex(durationPattern, "Формат TTL: 15m, 1h, 7d").default("15m"),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),
  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, "ENCRYPTION_KEY должен быть 64 hex-символа (32 байта)"),

  // Отдельный секрет: утечка токена арендатора не должна открывать платформу.
  PLATFORM_JWT_SECRET: z.string().default(""),
  OPENAI_API_KEY: z.string().default(""),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  AI_MAX_TOOL_ITERATIONS: z.coerce.number().int().min(1).max(10).default(5),
  AI_HISTORY_WINDOW: z.coerce.number().int().min(4).max(100).default(20),
  AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().min(1000).max(120000).default(45000),

  TELEGRAM_API_BASE: z.string().url().default("https://api.telegram.org"),
  PUBLIC_WEBHOOK_URL: z.string().default("http://localhost:4000"),

  CONVERSATION_IDLE_HOURS: z.coerce.number().int().min(1).max(720).default(24),
});

export type Env = z.infer<typeof envSchema> & {
  isProduction: boolean;
  isTest: boolean;
  aiEnabled: boolean;
  platformEnabled: boolean;
  corsOrigins: string[];
};

function buildEnv(source: NodeJS.ProcessEnv): Env {
  const parsed = envSchema.safeParse(source);

  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Некорректная конфигурация окружения:\n${problems}`);
  }

  const value = parsed.data;

  if (value.NODE_ENV === "production" && value.JWT_ACCESS_SECRET === value.JWT_REFRESH_SECRET) {
    throw new Error("JWT_ACCESS_SECRET и JWT_REFRESH_SECRET должны различаться");
  }

  const platformSecret = value.PLATFORM_JWT_SECRET.trim();
  if (platformSecret.length > 0 && platformSecret.length < 32) {
    throw new Error("PLATFORM_JWT_SECRET должен быть не короче 32 символов");
  }
  if (platformSecret.length > 0 && platformSecret === value.JWT_ACCESS_SECRET) {
    throw new Error("PLATFORM_JWT_SECRET должен отличаться от JWT_ACCESS_SECRET");
  }

  return {
    ...value,
    isProduction: value.NODE_ENV === "production",
    isTest: value.NODE_ENV === "test",
    aiEnabled: value.OPENAI_API_KEY.trim().length > 0,
    // Пустой секрет = платформенная админка не смонтирована вовсе.
    platformEnabled: value.PLATFORM_JWT_SECRET.trim().length >= 32,
    corsOrigins: value.WEB_ORIGIN.split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
  };
}

export const env: Env = buildEnv(process.env);
