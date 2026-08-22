import { ChannelType, type ChannelDto } from "@ai-sales/shared";
import { env } from "../../config/env.js";
import { channelError, notFound } from "../../core/errors.js";
import { logger } from "../../core/logger.js";
import {
  decryptSecret,
  encryptSecret,
  generateWebhookSecret,
  maskBotToken,
} from "../../core/security/crypto.js";
import type { AuthContext } from "../../core/security/tokens.js";
import type { ChannelEntity } from "../../domain/entities.js";
import type { Repositories } from "../../domain/repositories.js";
import { toChannelDto } from "../shared/mappers.js";
import type { TelegramTransport } from "./telegram/telegram.types.js";

export function buildWebhookUrl(channelId: string): string {
  return `${env.PUBLIC_WEBHOOK_URL.replace(/\/+$/, "")}/api/v1/webhooks/telegram/${channelId}`;
}

export class ChannelsService {
  constructor(
    private readonly repos: Repositories,
    private readonly transport: TelegramTransport,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(auth: AuthContext): Promise<ChannelDto[]> {
    const channels = await this.repos.channels.listByCompany(auth.companyId);
    return channels.map((channel) => this.present(channel));
  }

  /**
   * Подключение бота: проверяем токен через getMe, сохраняем его зашифрованным
   * и регистрируем webhook с секретом. Если Telegram отказал — канал гасится.
   */
  async connectTelegram(auth: AuthContext, botToken: string): Promise<ChannelDto> {
    const identity = await this.transport.getMe(botToken);

    const channel = await this.repos.channels.upsertByType(auth.companyId, {
      type: ChannelType.TELEGRAM,
      botUsername: identity.username,
      botExternalId: String(identity.id),
      botTokenCiphertext: encryptSecret(botToken),
      webhookSecret: generateWebhookSecret(),
      isActive: true,
      lastConnectedAt: this.now(),
    });

    try {
      await this.transport.setWebhook(botToken, buildWebhookUrl(channel.id), channel.webhookSecret);
    } catch (error) {
      await this.repos.channels.deactivate(auth.companyId, channel.id);
      logger.error({ err: error, companyId: auth.companyId }, "Не удалось установить webhook");
      throw channelError(
        "Telegram не принял webhook. Проверьте, что PUBLIC_WEBHOOK_URL доступен по HTTPS.",
      );
    }

    return this.present(channel);
  }

  /** Повторная регистрация webhook: нужна после смены домена или сертификата. */
  async verifyTelegram(auth: AuthContext): Promise<ChannelDto> {
    const channel = await this.repos.channels.findByType(auth.companyId, ChannelType.TELEGRAM);
    if (!channel) throw notFound("Telegram-канал не подключён");

    const botToken = decryptSecret(channel.botTokenCiphertext);
    const identity = await this.transport.getMe(botToken);
    await this.transport.setWebhook(botToken, buildWebhookUrl(channel.id), channel.webhookSecret);

    const updated = await this.repos.channels.upsertByType(auth.companyId, {
      type: ChannelType.TELEGRAM,
      botUsername: identity.username,
      botExternalId: String(identity.id),
      botTokenCiphertext: channel.botTokenCiphertext,
      webhookSecret: channel.webhookSecret,
      isActive: true,
      lastConnectedAt: this.now(),
    });

    return this.present(updated);
  }

  async disconnect(auth: AuthContext, channelId: string): Promise<void> {
    const channel = await this.repos.channels.findById(auth.companyId, channelId);
    if (!channel) throw notFound("Канал не найден");

    try {
      await this.transport.deleteWebhook(decryptSecret(channel.botTokenCiphertext));
    } catch (error) {
      logger.warn({ err: error, channelId }, "Не удалось снять webhook, канал всё равно отключён");
    }

    await this.repos.channels.deactivate(auth.companyId, channelId);
  }

  private present(channel: ChannelEntity): ChannelDto {
    let masked = "***";
    try {
      masked = maskBotToken(decryptSecret(channel.botTokenCiphertext));
    } catch {
      masked = "***";
    }
    return toChannelDto(channel, masked, buildWebhookUrl(channel.id));
  }
}