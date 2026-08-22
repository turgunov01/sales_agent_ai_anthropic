import {
  Currency,
  LeadEventType,
  LeadSource,
  LeadStatus,
  canTransitionLead,
  type LeadDto,
  type LeadWithEventsDto,
  type PaginationMeta,
} from "@ai-sales/shared";
import { badRequest, conflict, notFound } from "../../core/errors.js";
import { buildPaginationMeta } from "../../core/http/respond.js";
import type { AuthContext } from "../../core/security/tokens.js";
import { normalizePhone } from "../../core/utils/phone.js";
import type { LeadEntity } from "../../domain/entities.js";
import type { LeadFilter, LeadWriteInput, Repositories } from "../../domain/repositories.js";
import { toCustomerDto, toLeadDto, toLeadEventDto } from "../shared/mappers.js";
import {
  calculateQualificationScore,
  deriveAutoStatus,
  type ScorableLead,
} from "./leads.scoring.js";
import type {
  ChangeStatusInput,
  CreateLeadInput,
  ListLeadsQuery,
  UpdateLeadInput,
} from "./leads.schema.js";

export interface AgentLeadInput {
  customerId: string;
  conversationId: string;
  telegramUserId: string | null;
  name?: string | null;
  phone?: string | null;
  interest?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: Currency;
  interestedProductIds?: string[];
  summary?: string | null;
  /**
   * Запасной интерес из переписки. Применяется, только когда ни агент,
   * ни существующий лид интерес не задали.
   */
  fallbackInterest?: string | null;
}

export class LeadsService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async list(
    auth: AuthContext,
    query: ListLeadsQuery,
  ): Promise<{ items: LeadDto[]; meta: PaginationMeta }> {
    const filter: LeadFilter = {};
    if (query.status) filter.status = query.status;
    if (query.assignedManagerId) filter.assignedManagerId = query.assignedManagerId;
    if (query.q) filter.search = query.q;
    if (query.from) filter.from = query.from;
    if (query.to) filter.to = query.to;

    const result = await this.repos.leads.list(auth.companyId, filter, {
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items.map(toLeadDto),
      meta: buildPaginationMeta(query.page, query.limit, result.total),
    };
  }

  async get(auth: AuthContext, leadId: string): Promise<LeadWithEventsDto> {
    const lead = await this.requireLead(auth.companyId, leadId);
    const [events, customer] = await Promise.all([
      this.repos.leads.listEvents(auth.companyId, leadId),
      this.repos.customers.findById(auth.companyId, lead.customerId),
    ]);

    return {
      ...toLeadDto(lead),
      events: events.map(toLeadEventDto),
      customer: customer ? toCustomerDto(customer) : null,
    };
  }

  async create(auth: AuthContext, input: CreateLeadInput): Promise<LeadDto> {
    const customer = await this.repos.customers.findById(auth.companyId, input.customerId);
    if (!customer) throw notFound("Клиент не найден");

    const phone = input.phone ? normalizePhone(input.phone) : null;
    if (input.phone && !phone) throw badRequest("Некорректный номер телефона");

    const scorable = {
      name: input.name,
      phone,
      interest: input.interest,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      interestedProductIds: input.interestedProductIds,
    };

    const payload: LeadWriteInput = {
      customerId: input.customerId,
      conversationId: input.conversationId,
      name: input.name,
      phone,
      telegramUserId: customer.externalId,
      source: LeadSource.MANUAL,
      interest: input.interest,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency,
      status: deriveAutoStatus(scorable, LeadStatus.NEW),
      aiSummary: input.aiSummary,
      qualificationScore: calculateQualificationScore(scorable),
      interestedProductIds: input.interestedProductIds,
      assignedManagerId: input.assignedManagerId,
    };

    const lead = await this.repos.leads.create(auth.companyId, payload);
    await this.repos.leads.addEvent(auth.companyId, {
      leadId: lead.id,
      type: LeadEventType.CREATED,
      fromStatus: null,
      toStatus: lead.status,
      comment: "Лид создан вручную",
      actorUserId: auth.userId,
    });
    return toLeadDto(lead);
  }

  async update(auth: AuthContext, leadId: string, input: UpdateLeadInput): Promise<LeadDto> {
    const lead = await this.requireLead(auth.companyId, leadId);

    let phone = lead.phone;
    if (input.phone !== undefined) {
      if (input.phone === null) {
        phone = null;
      } else {
        const normalized = normalizePhone(input.phone);
        if (!normalized) throw badRequest("Некорректный номер телефона");
        phone = normalized;
      }
    }

    const merged = {
      name: input.name !== undefined ? input.name : lead.name,
      phone,
      interest: input.interest !== undefined ? input.interest : lead.interest,
      budgetMin: input.budgetMin !== undefined ? input.budgetMin : lead.budgetMin,
      budgetMax: input.budgetMax !== undefined ? input.budgetMax : lead.budgetMax,
      interestedProductIds:
        input.interestedProductIds !== undefined
          ? input.interestedProductIds
          : lead.interestedProductIds,
    };

    const updated = await this.repos.leads.update(auth.companyId, leadId, {
      ...merged,
      ...(input.currency !== undefined ? { currency: input.currency } : {}),
      ...(input.aiSummary !== undefined ? { aiSummary: input.aiSummary } : {}),
      qualificationScore: calculateQualificationScore(merged),
      status: deriveAutoStatus(merged, lead.status),
    });
    if (!updated) throw notFound("Лид не найден");

    const contactAppeared = !lead.phone && Boolean(updated.phone);
    if (contactAppeared) {
      await this.repos.leads.addEvent(auth.companyId, {
        leadId,
        type: LeadEventType.CONTACT_CAPTURED,
        fromStatus: lead.status,
        toStatus: updated.status,
        comment: "Получен контакт клиента",
        actorUserId: auth.userId,
      });
    }

    return toLeadDto(updated);
  }

  async changeStatus(
    auth: AuthContext,
    leadId: string,
    input: ChangeStatusInput,
  ): Promise<LeadDto> {
    const lead = await this.requireLead(auth.companyId, leadId);

    if (lead.status === input.status) throw conflict("Лид уже в этом статусе");
    if (!canTransitionLead(lead.status, input.status)) {
      throw conflict(`Переход ${lead.status} → ${input.status} недопустим`);
    }

    const at = this.now();
    const updated = await this.repos.leads.update(auth.companyId, leadId, {
      status: input.status,
      ...(input.status === LeadStatus.CONTACTED ? { contactedAt: at } : {}),
      ...(input.status === LeadStatus.WON || input.status === LeadStatus.LOST
        ? { closedAt: at }
        : {}),
    });
    if (!updated) throw notFound("Лид не найден");

    await this.repos.leads.addEvent(auth.companyId, {
      leadId,
      type: LeadEventType.STATUS_CHANGED,
      fromStatus: lead.status,
      toStatus: input.status,
      comment: input.comment,
      actorUserId: auth.userId,
    });

    return toLeadDto(updated);
  }

  async assign(auth: AuthContext, leadId: string, managerId: string | null): Promise<LeadDto> {
    const lead = await this.requireLead(auth.companyId, leadId);

    if (managerId) {
      const manager = await this.repos.users.findById(auth.companyId, managerId);
      if (!manager) throw notFound("Менеджер не найден");
      if (!manager.isActive) throw conflict("Менеджер отключён");
    }

    const updated = await this.repos.leads.update(auth.companyId, leadId, {
      assignedManagerId: managerId,
    });
    if (!updated) throw notFound("Лид не найден");

    await this.repos.leads.addEvent(auth.companyId, {
      leadId,
      type: LeadEventType.ASSIGNED,
      fromStatus: lead.status,
      toStatus: lead.status,
      comment: managerId ? `Назначен менеджер ${managerId}` : "Менеджер снят",
      actorUserId: auth.userId,
    });

    return toLeadDto(updated);
  }

  /**
   * Создание или дополнение лида из диалога с AI.
   * Вызывается исполнителем инструментов; companyId приходит из контекста канала.
   */
  async upsertFromAgent(companyId: string, input: AgentLeadInput): Promise<LeadEntity> {
    const existing = await this.repos.leads.findOpenByConversation(companyId, input.conversationId);
    const merged = this.mergeAgentData(existing, input);
    const summary = input.summary ?? existing?.aiSummary ?? null;
    const score = calculateQualificationScore(merged);

    if (!existing) {
      const created = await this.repos.leads.create(companyId, {
        customerId: input.customerId,
        conversationId: input.conversationId,
        ...merged,
        telegramUserId: input.telegramUserId,
        source: LeadSource.TELEGRAM,
        currency: input.currency ?? Currency.UZS,
        status: deriveAutoStatus(merged, LeadStatus.NEW),
        aiSummary: summary,
        qualificationScore: score,
        assignedManagerId: null,
      });

      await this.repos.leads.addEvent(companyId, {
        leadId: created.id,
        type: LeadEventType.CREATED,
        fromStatus: null,
        toStatus: created.status,
        comment: "Лид создан AI-ассистентом",
        actorUserId: null,
      });
      return created;
    }

    const updated = await this.repos.leads.update(companyId, existing.id, {
      ...merged,
      aiSummary: summary,
      qualificationScore: score,
      status: deriveAutoStatus(merged, existing.status),
      ...(input.currency ? { currency: input.currency } : {}),
    });
    if (!updated) throw notFound("Лид не найден");

    if (!existing.phone && updated.phone) {
      await this.repos.leads.addEvent(companyId, {
        leadId: updated.id,
        type: LeadEventType.CONTACT_CAPTURED,
        fromStatus: existing.status,
        toStatus: updated.status,
        comment: "AI получил контакт клиента",
        actorUserId: null,
      });
    }
    if (existing.status !== updated.status) {
      await this.repos.leads.addEvent(companyId, {
        leadId: updated.id,
        type: LeadEventType.STATUS_CHANGED,
        fromStatus: existing.status,
        toStatus: updated.status,
        comment: "Статус пересчитан автоматически",
        actorUserId: null,
      });
    }

    return updated;
  }

  async findOpenByConversation(
    companyId: string,
    conversationId: string,
  ): Promise<LeadEntity | null> {
    return this.repos.leads.findOpenByConversation(companyId, conversationId);
  }

  /** Данные от агента дополняют лид, но никогда не затирают уже известные поля. */
  private mergeAgentData(existing: LeadEntity | null, input: AgentLeadInput): ScorableLead {
    const phone = input.phone ? normalizePhone(input.phone) : null;
    return {
      name: input.name ?? existing?.name ?? null,
      phone: phone ?? existing?.phone ?? null,
      interest: input.interest ?? existing?.interest ?? input.fallbackInterest ?? null,
      budgetMin: input.budgetMin ?? existing?.budgetMin ?? null,
      budgetMax: input.budgetMax ?? existing?.budgetMax ?? null,
      interestedProductIds: this.mergeProductIds(
        existing?.interestedProductIds ?? [],
        input.interestedProductIds ?? [],
      ),
    };
  }

  private mergeProductIds(current: string[], incoming: string[]): string[] {
    return Array.from(new Set([...current, ...incoming])).slice(0, 20);
  }

  private async requireLead(companyId: string, leadId: string): Promise<LeadEntity> {
    const lead = await this.repos.leads.findById(companyId, leadId);
    if (!lead) throw notFound("Лид не найден");
    return lead;
  }
}