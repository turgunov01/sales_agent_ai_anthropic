import {
  ChannelType,
  ConversationStatus,
  Language,
  MessageRole,
  MessageType,
} from "@ai-sales/shared";
import { logger } from "../../../core/logger.js";
import { decryptSecret } from "../../../core/security/crypto.js";
import { extractPhone, normalizePhone } from "../../../core/utils/phone.js";
import type { ChannelEntity } from "../../../domain/entities.js";
import type { Repositories } from "../../../domain/repositories.js";
import type { AiAgentService } from "../../ai/agent.service.js";
import { detectLanguage } from "../../ai/language.js";
import type { AgentEffect } from "../../ai/types.js";
import type {
  ConversationsService,
  OutboundDelivery,
} from "../../conversations/conversations.service.js";
import type { LeadsService } from "../../leads/leads.service.js";
import {
  CONTACT_BUTTON_LABEL,
  CONTACT_PROMPT,
  HANDOFF_NOTICE,
  formatProductCard,
} from "./telegram.presenter.js";
import type { TelegramMessage, TelegramTransport, TelegramUpdate } from "./telegram.types.js";

const MAX_PRODUCT_CARDS = 3;
const PROCESSED_UPDATES_LIMIT = 2000;

interface ExtractedContent {
  content: string;
  type: MessageType;
  attachments: unknown;
  phone: string | null;
}

const PLACEHOLDERS: Record<Language, { photo: string; voice: string; document: string }> = {
  RU: {
    photo: "[Клиент отправил фото]",
    voice: "[Клиент отправил голосовое сообщение. Попроси написать текстом.]",
    document: "[Клиент отправил файл]",
  },
  UZ: {
    photo: "[Mijoz rasm yubordi]",
    voice: "[Mijoz ovozli xabar yubordi. Matn ko'rinishida yozishni so'ra.]",
    document: "[Mijoz fayl yubordi]",
  },
};

export function extractContent(
  message: TelegramMessage,
  language: Language,
): ExtractedContent | null {
  if (message.contact) {
    const phone = normalizePhone(message.contact.phone_number);
    return {
      content: phone ? `Мой номер: ${phone}` : `Мой номер: ${message.contact.phone_number}`,
      type: MessageType.TEXT,
      attachments: { contact: true },
      phone,
    };
  }

  const text = message.text ?? message.caption;

  if (message.photo && message.photo.length > 0) {
    const largest = message.photo[message.photo.length - 1];
    return {
      content: text ? `${PLACEHOLDERS[language].photo} ${text}` : PLACEHOLDERS[language].photo,
      type: MessageType.PHOTO,
      attachments: { fileId: largest?.file_id ?? null },
      phone: null,
    };
  }

  if (message.voice) {
    return {
      content: PLACEHOLDERS[language].voice,
      type: MessageType.VOICE,
      attachments: { fileId: message.voice.file_id },
      phone: null,
    };
  }

  if (message.document) {
    return {
      content: text ? `${PLACEHOLDERS[language].document} ${text}` : PLACEHOLDERS[language].document,
      type: MessageType.DOCUMENT,
      attachments: { fileId: message.document.file_id },
      phone: null,
    };
  }

  if (text && text.trim().length > 0) {
    return {
      content: text.trim(),
      type: MessageType.TEXT,
      attachments: null,
      phone: extractPhone(text),
    };
  }

  return null;
}

/**
 * Связывает Telegram и доменные сервисы.
 * Компания определяется исключительно каналом, из которого пришёл апдейт.
 */
export class TelegramDispatcher implements OutboundDelivery {
  private readonly processedUpdates = new Set<string>();

  constructor(
    private readonly repos: Repositories,
    private readonly conversations: ConversationsService,
    private readonly leads: LeadsService,
    private readonly agent: AiAgentService,
    private readonly transport: TelegramTransport,
  ) {}

  async handleUpdate(channel: ChannelEntity, update: TelegramUpdate): Promise<void> {
    const key = `${channel.id}:${update.update_id}`;
    if (this.processedUpdates.has(key)) return;
    this.rememberUpdate(key);

    const message = update.message ?? update.edited_message;
    if (!message?.from || message.from.is_bot === true) return;

    const company = await this.repos.companies.findById(channel.companyId);
    if (!company) return;

    const externalId = String(message.from.id);
    const chatId = String(message.chat.id);

    const existing = await this.repos.customers.upsert(channel.companyId, {
      channelType: ChannelType.TELEGRAM,
      externalId,
      firstName: message.from.first_name ?? null,
      lastName: message.from.last_name ?? null,
      username: message.from.username ?? null,
      language: company.defaultLanguage,
    });

    const extracted = extractContent(message, existing.language);
    if (!extracted) return;

    const language = detectLanguage(extracted.content, existing.language);
    const customer =
      language === existing.language
        ? existing
        : ((await this.repos.customers.setLanguage(channel.companyId, existing.id, language)) ??
          existing);

    const conversation = await this.conversations.getOrCreateForCustomer(
      channel.companyId,
      customer,
      channel.id,
    );
    if (conversation.language !== language) {
      await this.conversations.setLanguage(channel.companyId, conversation.id, language);
    }

    await this.conversations.appendMessage(channel.companyId, {
      conversationId: conversation.id,
      role: MessageRole.CUSTOMER,
      type: extracted.type,
      content: extracted.content,
      attachments: extracted.attachments,
    });

    if (extracted.phone) {
      await this.repos.customers.setPhone(channel.companyId, customer.id, extracted.phone);
      await this.leads.upsertFromAgent(channel.companyId, {
        customerId: customer.id,
        conversationId: conversation.id,
        telegramUserId: customer.externalId,
        phone: extracted.phone,
        name: customer.firstName,
      });
    }

    if (conversation.status === ConversationStatus.HUMAN_HANDLING) {
      logger.debug(
        { conversationId: conversation.id },
        "Диалог ведёт менеджер — AI не отвечает",
      );
      return;
    }

    const result = await this.agent.reply({
      companyId: channel.companyId,
      conversationId: conversation.id,
      customerId: customer.id,
      customerExternalId: customer.externalId,
      customerName: customer.firstName,
      customerPhone: extracted.phone ?? customer.phone,
      language,
    });

    if (result.text.trim().length === 0) return;

    const botToken = decryptSecret(channel.botTokenCiphertext);

    await this.conversations.appendMessage(channel.companyId, {
      conversationId: conversation.id,
      role: MessageRole.ASSISTANT,
      type: MessageType.TEXT,
      content: result.text,
      toolCalls: result.toolCalls.length > 0 ? result.toolCalls : null,
      tokensIn: result.usage.inputTokens,
      tokensOut: result.usage.outputTokens,
    });

    await this.transport.sendMessage(botToken, { chatId, text: result.text });
    await this.applyEffects(channel, conversation.id, chatId, botToken, language, result.effects);
  }

  async deliverText(input: {
    companyId: string;
    channelId: string;
    customerExternalId: string;
    text: string;
  }): Promise<void> {
    const channel = await this.repos.channels.findById(input.companyId, input.channelId);
    if (!channel || !channel.isActive) {
      logger.warn({ channelId: input.channelId }, "Канал недоступен для отправки сообщения");
      return;
    }
    const botToken = decryptSecret(channel.botTokenCiphertext);
    await this.transport.sendMessage(botToken, {
      chatId: input.customerExternalId,
      text: input.text,
    });
  }

  private async applyEffects(
    channel: ChannelEntity,
    conversationId: string,
    chatId: string,
    botToken: string,
    language: Language,
    effects: AgentEffect[],
  ): Promise<void> {
    let cardsSent = 0;

    for (const effect of effects) {
      try {
        if (effect.type === "SHOW_PRODUCTS") {
          const remaining = MAX_PRODUCT_CARDS - cardsSent;
          if (remaining <= 0) continue;
          cardsSent += await this.sendProductCards(
            channel.companyId,
            botToken,
            chatId,
            language,
            effect.productIds.slice(0, remaining),
          );
          continue;
        }

        if (effect.type === "REQUEST_CONTACT") {
          await this.transport.sendMessage(botToken, {
            chatId,
            text: CONTACT_PROMPT[language],
            requestContactButton: { label: CONTACT_BUTTON_LABEL[language] },
          });
          continue;
        }

        if (effect.type === "TRANSFER_TO_MANAGER") {
          await this.conversations.markHandoff(channel.companyId, conversationId, effect.reason);
          await this.transport.sendMessage(botToken, {
            chatId,
            text: HANDOFF_NOTICE[language],
          });
        }
      } catch (error) {
        logger.error(
          { err: error, effect: effect.type, companyId: channel.companyId },
          "Не удалось применить эффект агента",
        );
      }
    }
  }

  /** Товар с фото уходит карточкой sendPhoto, без фото — обычным сообщением. */
  private async sendProductCards(
    companyId: string,
    botToken: string,
    chatId: string,
    language: Language,
    productIds: string[],
  ): Promise<number> {
    const products = await this.repos.products.findManyByIds(companyId, productIds);

    for (const product of products) {
      const caption = formatProductCard(product, language);
      const photo = product.images[0];
      if (photo) {
        await this.transport.sendPhoto(botToken, { chatId, photoUrl: photo, caption });
      } else {
        await this.transport.sendMessage(botToken, { chatId, text: caption });
      }
    }

    return products.length;
  }

  private rememberUpdate(key: string): void {
    if (this.processedUpdates.size >= PROCESSED_UPDATES_LIMIT) {
      const oldest = this.processedUpdates.values().next();
      if (!oldest.done) this.processedUpdates.delete(oldest.value);
    }
    this.processedUpdates.add(key);
  }
}