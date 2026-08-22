import {
  ConversationStatus,
  Language,
  MessageRole,
  MessageType,
  type ConversationDto,
  type MessageDto,
  type PaginationMeta,
} from "@ai-sales/shared";
import { conflict, notFound } from "../../core/errors.js";
import { buildPaginationMeta } from "../../core/http/respond.js";
import type { AuthContext } from "../../core/security/tokens.js";
import { truncate } from "../../core/utils/text.js";
import type { ConversationEntity, CustomerEntity, MessageEntity } from "../../domain/entities.js";
import type { ConversationFilter, Repositories } from "../../domain/repositories.js";
import { toConversationDto, toMessageDto } from "../shared/mappers.js";
import type { ListConversationsQuery } from "./conversations.schema.js";

/** Порт доставки исходящего сообщения в канал клиента. Реализуется модулем канала. */
export interface OutboundDelivery {
  deliverText(input: {
    companyId: string;
    channelId: string;
    customerExternalId: string;
    text: string;
  }): Promise<void>;
}

export class ConversationsService {
  constructor(
    private readonly repos: Repositories,
    private readonly delivery: OutboundDelivery,
    private readonly idleHours: number,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(
    auth: AuthContext,
    queryInput: ListConversationsQuery,
  ): Promise<{ items: ConversationDto[]; meta: PaginationMeta }> {
    const filter: ConversationFilter = {};
    if (queryInput.status) filter.status = queryInput.status;
    if (queryInput.assignedUserId) filter.assignedUserId = queryInput.assignedUserId;

    const result = await this.repos.conversations.list(auth.companyId, filter, {
      page: queryInput.page,
      limit: queryInput.limit,
    });

    const items: ConversationDto[] = [];
    for (const conversation of result.items) {
      const customer = await this.repos.customers.findById(
        auth.companyId,
        conversation.customerId,
      );
      if (!customer) continue;
      const [lastMessage] = await this.repos.conversations.listMessages(
        auth.companyId,
        conversation.id,
        1,
      );
      items.push(
        toConversationDto(conversation, customer, {
          lastMessagePreview: lastMessage ? truncate(lastMessage.content, 120) : "",
        }),
      );
    }

    return {
      items,
      meta: buildPaginationMeta(queryInput.page, queryInput.limit, result.total),
    };
  }

  async get(auth: AuthContext, conversationId: string): Promise<ConversationDto> {
    const conversation = await this.requireConversation(auth.companyId, conversationId);
    const customer = await this.repos.customers.findById(
      auth.companyId,
      conversation.customerId,
    );
    if (!customer) throw notFound("Клиент не найден");
    return toConversationDto(conversation, customer);
  }

  async listMessages(
    auth: AuthContext,
    conversationId: string,
    limit: number,
  ): Promise<MessageDto[]> {
    await this.requireConversation(auth.companyId, conversationId);
    const messages = await this.repos.conversations.listMessages(
      auth.companyId,
      conversationId,
      limit,
    );
    return messages.map(toMessageDto);
  }

  /**
   * Ответ менеджера: сохраняется в историю, уходит в канал и переводит диалог
   * в режим ручной работы — AI перестаёт отвечать до явного возврата.
   */
  async sendManagerMessage(
    auth: AuthContext,
    conversationId: string,
    text: string,
  ): Promise<MessageDto> {
    const conversation = await this.requireConversation(auth.companyId, conversationId);
    if (conversation.status === ConversationStatus.CLOSED) {
      throw conflict("Диалог закрыт");
    }

    const customer = await this.repos.customers.findById(auth.companyId, conversation.customerId);
    if (!customer) throw notFound("Клиент не найден");

    const message = await this.repos.conversations.addMessage(auth.companyId, {
      conversationId,
      role: MessageRole.MANAGER,
      type: MessageType.TEXT,
      content: text,
    });

    await this.repos.conversations.update(auth.companyId, conversationId, {
      status: ConversationStatus.HUMAN_HANDLING,
      assignedUserId: conversation.assignedUserId ?? auth.userId,
    });

    await this.delivery.deliverText({
      companyId: auth.companyId,
      channelId: conversation.channelId,
      customerExternalId: customer.externalId,
      text,
    });

    return toMessageDto(message);
  }

  async takeover(auth: AuthContext, conversationId: string): Promise<ConversationDto> {
    const conversation = await this.requireConversation(auth.companyId, conversationId);
    const updated = await this.repos.conversations.update(auth.companyId, conversationId, {
      status: ConversationStatus.HUMAN_HANDLING,
      assignedUserId: auth.userId,
    });
    if (!updated) throw notFound("Диалог не найден");

    await this.repos.conversations.addMessage(auth.companyId, {
      conversationId,
      role: MessageRole.SYSTEM,
      type: MessageType.SYSTEM_EVENT,
      content: "Менеджер подключился к диалогу",
    });

    const customer = await this.repos.customers.findById(auth.companyId, conversation.customerId);
    if (!customer) throw notFound("Клиент не найден");
    return toConversationDto(updated, customer);
  }

  async release(auth: AuthContext, conversationId: string): Promise<ConversationDto> {
    const conversation = await this.requireConversation(auth.companyId, conversationId);
    const updated = await this.repos.conversations.update(auth.companyId, conversationId, {
      status: ConversationStatus.ACTIVE,
      assignedUserId: null,
      handoffReason: null,
    });
    if (!updated) throw notFound("Диалог не найден");

    await this.repos.conversations.addMessage(auth.companyId, {
      conversationId,
      role: MessageRole.SYSTEM,
      type: MessageType.SYSTEM_EVENT,
      content: "Диалог возвращён AI-ассистенту",
    });

    const customer = await this.repos.customers.findById(auth.companyId, conversation.customerId);
    if (!customer) throw notFound("Клиент не найден");
    return toConversationDto(updated, customer);
  }

  async close(auth: AuthContext, conversationId: string): Promise<ConversationDto> {
    const conversation = await this.requireConversation(auth.companyId, conversationId);
    const updated = await this.repos.conversations.update(auth.companyId, conversationId, {
      status: ConversationStatus.CLOSED,
      closedAt: this.now(),
    });
    if (!updated) throw notFound("Диалог не найден");

    const customer = await this.repos.customers.findById(auth.companyId, conversation.customerId);
    if (!customer) throw notFound("Клиент не найден");
    return toConversationDto(updated, customer);
  }

  // ─────────────── Методы для канального слоя (без AuthContext) ───────────────

  async getOrCreateForCustomer(
    companyId: string,
    customer: CustomerEntity,
    channelId: string,
  ): Promise<ConversationEntity> {
    const threshold = new Date(this.now().getTime() - this.idleHours * 60 * 60 * 1000);
    const existing = await this.repos.conversations.findActiveForCustomer(
      companyId,
      customer.id,
      threshold,
    );
    if (existing) return existing;

    return this.repos.conversations.create(companyId, {
      customerId: customer.id,
      channelId,
      language: customer.language ?? Language.RU,
    });
  }

  async appendMessage(
    companyId: string,
    input: {
      conversationId: string;
      role: MessageRole;
      type: MessageType;
      content: string;
      attachments?: unknown;
      toolCalls?: unknown;
      tokensIn?: number | null;
      tokensOut?: number | null;
    },
  ): Promise<MessageEntity> {
    return this.repos.conversations.addMessage(companyId, input);
  }

  async history(companyId: string, conversationId: string, limit: number): Promise<MessageEntity[]> {
    return this.repos.conversations.listMessages(companyId, conversationId, limit);
  }

  async markHandoff(
    companyId: string,
    conversationId: string,
    reason: string,
  ): Promise<void> {
    await this.repos.conversations.update(companyId, conversationId, {
      status: ConversationStatus.HANDOFF_REQUESTED,
      handoffReason: reason,
    });
    await this.repos.conversations.addMessage(companyId, {
      conversationId,
      role: MessageRole.SYSTEM,
      type: MessageType.SYSTEM_EVENT,
      content: `Запрошена передача менеджеру: ${reason}`,
    });
  }

  async setLanguage(
    companyId: string,
    conversationId: string,
    language: Language,
  ): Promise<void> {
    await this.repos.conversations.update(companyId, conversationId, { language });
  }

  private async requireConversation(
    companyId: string,
    conversationId: string,
  ): Promise<ConversationEntity> {
    const conversation = await this.repos.conversations.findById(companyId, conversationId);
    if (!conversation) throw notFound("Диалог не найден");
    return conversation;
  }
}