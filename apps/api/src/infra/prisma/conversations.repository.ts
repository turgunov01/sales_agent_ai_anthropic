import { Prisma } from "@prisma/client";
import type { ConversationStatus, Language } from "@ai-sales/shared";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { ConversationEntity, MessageEntity } from "../../domain/entities.js";
import type {
  ConversationFilter,
  ConversationsRepository,
  CreateMessageInput,
  Paged,
  PageQuery,
} from "../../domain/repositories.js";
import { mapConversation, mapMessage } from "./mappers.js";

export class PrismaConversationsRepository implements ConversationsRepository {
  constructor(private readonly db: GuardedDatabase) {}

  async list(
    companyId: string,
    filter: ConversationFilter,
    page: PageQuery,
  ): Promise<Paged<ConversationEntity>> {
    const where: Prisma.ConversationWhereInput = { companyId };
    if (filter.status) where.status = filter.status;
    if (filter.assignedUserId) where.assignedUserId = filter.assignedUserId;
    if (filter.customerId) where.customerId = filter.customerId;

    const [rows, total] = await Promise.all([
      this.db.conversation.findMany({
        where,
        orderBy: { lastMessageAt: "desc" },
        skip: (page.page - 1) * page.limit,
        take: page.limit,
      }),
      this.db.conversation.count({ where }),
    ]);
    return { items: rows.map(mapConversation), total };
  }

  async findById(companyId: string, conversationId: string): Promise<ConversationEntity | null> {
    const row = await this.db.conversation.findFirst({ where: { id: conversationId, companyId } });
    return row ? mapConversation(row) : null;
  }

  async findActiveForCustomer(
    companyId: string,
    customerId: string,
    notOlderThan: Date,
  ): Promise<ConversationEntity | null> {
    const row = await this.db.conversation.findFirst({
      where: {
        companyId,
        customerId,
        status: { not: "CLOSED" },
        lastMessageAt: { gte: notOlderThan },
      },
      orderBy: { lastMessageAt: "desc" },
    });
    return row ? mapConversation(row) : null;
  }

  async create(
    companyId: string,
    input: { customerId: string; channelId: string; language: Language },
  ): Promise<ConversationEntity> {
    const row = await this.db.conversation.create({ data: { companyId, ...input } });
    return mapConversation(row);
  }

  async update(
    companyId: string,
    conversationId: string,
    data: Partial<
      Pick<
        ConversationEntity,
        "status" | "assignedUserId" | "handoffReason" | "language" | "lastMessageAt" | "closedAt"
      >
    >,
  ): Promise<ConversationEntity | null> {
    const result = await this.db.conversation.updateMany({
      where: { id: conversationId, companyId },
      data,
    });
    if (result.count === 0) return null;
    return this.findById(companyId, conversationId);
  }

  async addMessage(companyId: string, input: CreateMessageInput): Promise<MessageEntity> {
    const row = await this.db.message.create({
      data: {
        companyId,
        conversationId: input.conversationId,
        role: input.role,
        type: input.type,
        content: input.content,
        attachments: (input.attachments ?? Prisma.DbNull) as Prisma.InputJsonValue,
        toolCalls: (input.toolCalls ?? Prisma.DbNull) as Prisma.InputJsonValue,
        tokensIn: input.tokensIn ?? null,
        tokensOut: input.tokensOut ?? null,
      },
    });

    await this.db.conversation.updateMany({
      where: { id: input.conversationId, companyId },
      data: { lastMessageAt: row.createdAt },
    });

    return mapMessage(row);
  }

  async listMessages(
    companyId: string,
    conversationId: string,
    limit: number,
  ): Promise<MessageEntity[]> {
    const rows = await this.db.message.findMany({
      where: { companyId, conversationId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    return rows.reverse().map(mapMessage);
  }

  async countAll(companyId: string, since?: Date): Promise<number> {
    return this.db.conversation.count({
      where: { companyId, ...(since ? { createdAt: { gte: since } } : {}) },
    });
  }

  async countByStatus(companyId: string, status: ConversationStatus): Promise<number> {
    return this.db.conversation.count({ where: { companyId, status } });
  }

  async countMessages(
    companyId: string,
    since?: Date,
  ): Promise<{ total: number; assistant: number }> {
    const baseWhere: Prisma.MessageWhereInput = {
      companyId,
      ...(since ? { createdAt: { gte: since } } : {}),
    };
    const [total, assistant] = await Promise.all([
      this.db.message.count({ where: baseWhere }),
      this.db.message.count({ where: { ...baseWhere, role: "ASSISTANT" } }),
    ]);
    return { total, assistant };
  }

  async listCreatedSince(companyId: string, since: Date): Promise<ConversationEntity[]> {
    const rows = await this.db.conversation.findMany({
      where: { companyId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapConversation);
  }
}