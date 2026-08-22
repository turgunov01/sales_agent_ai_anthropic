import rateLimit, { type Options } from "express-rate-limit";
import { env } from "../../config/env.js";
import { rateLimited } from "../errors.js";

function build(options: Pick<Options, "windowMs" | "limit"> & { message: string }) {
  return rateLimit({
    windowMs: options.windowMs,
    limit: options.limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    skip: () => env.isTest,
    handler: (_req, _res, next) => {
      next(rateLimited(options.message));
    },
  });
}

/** Вход и регистрация — самые ценные цели для перебора. */
export const authRateLimit = build({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Слишком много попыток входа. Повторите через 15 минут.",
});

/** Публичный вебхук: защита от флуда, лимит выше обычного трафика Telegram. */
export const webhookRateLimit = build({
  windowMs: 60 * 1000,
  limit: 120,
  message: "Слишком много запросов к вебхуку.",
});

export const apiRateLimit = build({
  windowMs: 60 * 1000,
  limit: 300,
  message: "Слишком много запросов. Попробуйте позже.",
});