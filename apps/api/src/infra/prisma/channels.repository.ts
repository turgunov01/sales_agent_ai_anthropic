import type { PrismaClient } from "@prisma/client";
import type { ChannelType } from "@ai-sales/shared";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { ChannelEntity } from "../../domain/entities.js";
import type { ChannelWriteInput, ChannelsRepository } from "../../domain/repositories.js";
import { mapChannel } from "./mappers.js";

export class PrismaChannelsRepository implements ChannelsRepository {
  constructor(
    private readonly db: GuardedDatabase,
    private readonly raw: PrismaClient,
  ) {}

  async listByCompany(companyId: string): Promise<ChannelEntity[]> {
    const rows = await this.db.channel.findMany({
      where: { companyId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapChannel);
  }

  async findById(companyId: string, channelId: string): Promise<ChannelEntity | null> {
    const row = await this.db.channel.findFirst({ where: { id: channelId, companyId } });
    return row ? mapChannel(row) : null;
  }

  /** Точка определения арендатора при приёме вебхука Telegram. */
  async findByIdUnscoped(channelId: string): Promise<ChannelEntity | null> {
    const row = await this.raw.channel.findUnique({ where: { id: channelId } });
    return row ? mapChannel(row) : null;
  }

  async findByType(companyId: string, type: ChannelType): Promise<ChannelEntity | null> {
    const row = await this.db.channel.findFirst({ where: { companyId, type } });
    return row ? mapChannel(row) : null;
  }

  /**
   * Поиск по всем компаниям — намеренно вне guard: мы как раз выясняем,
   * не занят ли бот другим арендатором, и арендатор здесь ещё не определён.
   */
  async findByBotExternalId(botExternalId: string): Promise<ChannelEntity | null> {
    const row = await this.raw.channel.findFirst({ where: { botExternalId } });
    return row ? mapChannel(row) : null;
  }

  async upsertByType(companyId: string, input: ChannelWriteInput): Promise<ChannelEntity> {
    const row = await this.db.channel.upsert({
      where: { companyId_type: { companyId, type: input.type } },
      create: { companyId, ...input },
      update: {
        botUsername: input.botUsername,
        botExternalId: input.botExternalId,
        botTokenCiphertext: input.botTokenCiphertext,
        webhookSecret: input.webhookSecret,
        isActive: input.isActive,
        lastConnectedAt: input.lastConnectedAt,
      },
    });
    return mapChannel(row);
  }

  async deactivate(companyId: string, channelId: string): Promise<boolean> {
    const result = await this.db.channel.updateMany({
      where: { id: channelId, companyId },
      data: { isActive: false, botExternalId: null, botUsername: null, botTokenCiphertext: "" },
    });
    return result.count > 0;
  }
}