import { Prisma } from "@prisma/client";
import { LeadStatus } from "@ai-sales/shared";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { LeadEntity, LeadEventEntity } from "../../domain/entities.js";
import type {
  LeadFilter,
  LeadWriteInput,
  LeadsRepository,
  Paged,
  PageQuery,
} from "../../domain/repositories.js";
import { mapLead, mapLeadEvent } from "./mappers.js";

function decimalOrNull(value: number | null | undefined): Prisma.Decimal | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  return new Prisma.Decimal(value);
}

export class PrismaLeadsRepository implements LeadsRepository {
  constructor(private readonly db: GuardedDatabase) {}

  async list(
    companyId: string,
    filter: LeadFilter,
    page: PageQuery,
  ): Promise<Paged<LeadEntity>> {
    const where: Prisma.LeadWhereInput = { companyId };
    if (filter.status) where.status = filter.status;
    if (filter.assignedManagerId) where.assignedManagerId = filter.assignedManagerId;
    if (filter.from || filter.to) {
      where.createdAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }
    if (filter.search) {
      where.OR = [
        { name: { contains: filter.search, mode: "insensitive" } },
        { phone: { contains: filter.search } },
        { interest: { contains: filter.search, mode: "insensitive" } },
      ];
    }

    const [rows, total] = await Promise.all([
      this.db.lead.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page.page - 1) * page.limit,
        take: page.limit,
      }),
      this.db.lead.count({ where }),
    ]);
    return { items: rows.map(mapLead), total };
  }

  async findById(companyId: string, leadId: string): Promise<LeadEntity | null> {
    const row = await this.db.lead.findFirst({ where: { id: leadId, companyId } });
    return row ? mapLead(row) : null;
  }

  async findOpenByConversation(
    companyId: string,
    conversationId: string,
  ): Promise<LeadEntity | null> {
    const row = await this.db.lead.findFirst({
      where: { companyId, conversationId, status: { notIn: ["WON", "LOST"] } },
      orderBy: { createdAt: "desc" },
    });
    return row ? mapLead(row) : null;
  }

  async create(companyId: string, input: LeadWriteInput): Promise<LeadEntity> {
    const row = await this.db.lead.create({
      data: {
        companyId,
        customerId: input.customerId,
        conversationId: input.conversationId,
        name: input.name,
        phone: input.phone,
        telegramUserId: input.telegramUserId,
        source: input.source,
        interest: input.interest,
        budgetMin: decimalOrNull(input.budgetMin) ?? null,
        budgetMax: decimalOrNull(input.budgetMax) ?? null,
        currency: input.currency,
        status: input.status,
        aiSummary: input.aiSummary,
        qualificationScore: input.qualificationScore,
        interestedProductIds: input.interestedProductIds,
        assignedManagerId: input.assignedManagerId,
      },
    });
    return mapLead(row);
  }

  async update(
    companyId: string,
    leadId: string,
    data: Partial<LeadWriteInput> & { contactedAt?: Date | null; closedAt?: Date | null },
  ): Promise<LeadEntity | null> {
    const payload: Prisma.LeadUncheckedUpdateManyInput = {};
    if (data.name !== undefined) payload.name = data.name;
    if (data.phone !== undefined) payload.phone = data.phone;
    if (data.telegramUserId !== undefined) payload.telegramUserId = data.telegramUserId;
    if (data.interest !== undefined) payload.interest = data.interest;
    if (data.budgetMin !== undefined) payload.budgetMin = decimalOrNull(data.budgetMin) ?? null;
    if (data.budgetMax !== undefined) payload.budgetMax = decimalOrNull(data.budgetMax) ?? null;
    if (data.currency !== undefined) payload.currency = data.currency;
    if (data.status !== undefined) payload.status = data.status;
    if (data.aiSummary !== undefined) payload.aiSummary = data.aiSummary;
    if (data.qualificationScore !== undefined) payload.qualificationScore = data.qualificationScore;
    if (data.interestedProductIds !== undefined) {
      payload.interestedProductIds = data.interestedProductIds;
    }
    if (data.assignedManagerId !== undefined) payload.assignedManagerId = data.assignedManagerId;
    if (data.conversationId !== undefined) payload.conversationId = data.conversationId;
    if (data.contactedAt !== undefined) payload.contactedAt = data.contactedAt;
    if (data.closedAt !== undefined) payload.closedAt = data.closedAt;

    const result = await this.db.lead.updateMany({ where: { id: leadId, companyId }, data: payload });
    if (result.count === 0) return null;
    return this.findById(companyId, leadId);
  }

  async addEvent(
    companyId: string,
    input: {
      leadId: string;
      type: LeadEventEntity["type"];
      fromStatus: LeadEventEntity["fromStatus"];
      toStatus: LeadEventEntity["toStatus"];
      comment: string | null;
      actorUserId: string | null;
    },
  ): Promise<LeadEventEntity> {
    const row = await this.db.leadEvent.create({ data: { companyId, ...input } });
    return mapLeadEvent(row);
  }

  async listEvents(companyId: string, leadId: string): Promise<LeadEventEntity[]> {
    const rows = await this.db.leadEvent.findMany({
      where: { companyId, leadId },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapLeadEvent);
  }

  async countByStatus(companyId: string, since?: Date): Promise<Record<LeadStatus, number>> {
    const grouped = await this.db.lead.groupBy({
      by: ["status"],
      where: { companyId, ...(since ? { createdAt: { gte: since } } : {}) },
      _count: { _all: true },
    });

    const result: Record<LeadStatus, number> = {
      [LeadStatus.NEW]: 0,
      [LeadStatus.QUALIFIED]: 0,
      [LeadStatus.CONTACTED]: 0,
      [LeadStatus.WON]: 0,
      [LeadStatus.LOST]: 0,
    };
    for (const entry of grouped) {
      result[entry.status as LeadStatus] = entry._count._all;
    }
    return result;
  }

  async listCreatedSince(companyId: string, since: Date): Promise<LeadEntity[]> {
    const rows = await this.db.lead.findMany({
      where: { companyId, createdAt: { gte: since } },
      orderBy: { createdAt: "asc" },
    });
    return rows.map(mapLead);
  }
}