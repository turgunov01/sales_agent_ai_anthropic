import { env } from "../../../config/env.js";
import { channelError } from "../../../core/errors.js";
import { logger } from "../../../core/logger.js";
import type {
  BotIdentity,
  SendMessageParams,
  SendPhotoParams,
  TelegramTransport,
} from "./telegram.types.js";

interface TelegramApiResponse<T> {
  ok: boolean;
  result?: T;
  description?: string;
  error_code?: number;
}

const REQUEST_TIMEOUT_MS = 15_000;

export class HttpTelegramTransport implements TelegramTransport {
  constructor(private readonly apiBase: string = env.TELEGRAM_API_BASE) {}

  async getMe(botToken: string): Promise<BotIdentity> {
    const result = await this.call<{ id: number; username?: string }>(botToken, "getMe", {});
    return { id: result.id, username: result.username ?? null };
  }

  async setWebhook(botToken: string, url: string, secret: string): Promise<void> {
    await this.call(botToken, "setWebhook", {
      url,
      secret_token: secret,
      allowed_updates: ["message"],
      drop_pending_updates: true,
      max_connections: 40,
    });
  }

  async deleteWebhook(botToken: string): Promise<void> {
    await this.call(botToken, "deleteWebhook", { drop_pending_updates: false });
  }

  async sendMessage(botToken: string, params: SendMessageParams): Promise<void> {
    const payload: Record<string, unknown> = {
      chat_id: params.chatId,
      text: params.text,
      disable_web_page_preview: true,
    };

    if (params.requestContactButton) {
      payload.reply_markup = {
        keyboard: [[{ text: params.requestContactButton.label, request_contact: true }]],
        resize_keyboard: true,
        one_time_keyboard: true,
      };
    } else if (params.removeKeyboard) {
      payload.reply_markup = { remove_keyboard: true };
    }

    await this.call(botToken, "sendMessage", payload);
  }

  async sendPhoto(botToken: string, params: SendPhotoParams): Promise<void> {
    await this.call(botToken, "sendPhoto", {
      chat_id: params.chatId,
      photo: params.photoUrl,
      caption: params.caption,
    });
  }

  private async call<T>(
    botToken: string,
    method: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(`${this.apiBase}/bot${botToken}/${method}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      const body = (await response.json()) as TelegramApiResponse<T>;
      if (!response.ok || !body.ok || body.result === undefined) {
        const description = body.description ?? `HTTP ${response.status}`;
        logger.warn({ method, description }, "Telegram API вернул ошибку");
        throw channelError(`Telegram API: ${description}`);
      }
      return body.result;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw channelError("Telegram API не ответил вовремя");
      }
      if (error instanceof Error && error.name === "AppError") throw error;
      throw channelError("Не удалось обратиться к Telegram API", error);
    } finally {
      clearTimeout(timeout);
    }
  }
}