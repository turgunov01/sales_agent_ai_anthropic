import { Router, type Request, type Response } from "express";
import { asyncHandler } from "../../core/http/async-handler.js";
import { logger } from "../../core/logger.js";
import type { InProcessQueue } from "../../core/queue/in-process-queue.js";
import { safeCompare } from "../../core/security/tokens.js";
import { webhookRateLimit } from "../../core/security/rate-limit.js";
import type { Repositories } from "../../domain/repositories.js";
import type { TelegramDispatcher } from "./telegram/telegram.dispatcher.js";
import { telegramUpdateSchema } from "./telegram/telegram.types.js";

const SECRET_HEADER = "x-telegram-bot-api-secret-token";

/**
 * Вебхук всегда отвечает 200: Telegram повторяет доставку при любом другом коде,
 * а мы не хотим ни ретраев на невалидных апдейтах, ни подтверждения того,
 * что канал с таким id существует.
 */
export function createWebhookRouter(
  repos: Repositories,
  dispatcher: TelegramDispatcher,
  queue: InProcessQueue,
): Router {
  const router = Router();

  router.post(
    "/telegram/:channelId",
    webhookRateLimit,
    asyncHandler(async (req: Request, res: Response) => {
      const channelId = req.params.channelId ?? "";
      const providedSecret = req.header(SECRET_HEADER) ?? "";

      const channel = await repos.channels.findByIdUnscoped(channelId);
      if (!channel || !channel.isActive) {
        // Наружу — всё равно 200, чтобы не подтверждать существование канала,
        // но в лог пишем: молчащий бот иначе выглядит как исправный.
        logger.warn(
          { channelId, reason: channel ? "канал отключён" : "канал не найден" },
          "Апдейт Telegram отброшен",
        );
        res.status(200).json({ ok: true });
        return;
      }

      if (!safeCompare(providedSecret, channel.webhookSecret)) {
        logger.warn({ channelId, requestId: req.requestId }, "Неверный секрет вебхука Telegram");
        res.status(200).json({ ok: true });
        return;
      }

      const parsed = telegramUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        logger.warn({ channelId }, "Апдейт Telegram не прошёл валидацию");
        res.status(200).json({ ok: true });
        return;
      }

      res.status(200).json({ ok: true });

      queue.enqueue(`telegram:${channelId}:${parsed.data.update_id}`, async () => {
        await dispatcher.handleUpdate(channel, parsed.data);
      });
    }),
  );

  return router;
}