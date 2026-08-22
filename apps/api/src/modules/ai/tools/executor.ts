import { z } from "zod";
import { Currency, type LeadStatus } from "@ai-sales/shared";
import { logger } from "../../../core/logger.js";
import { formatPrice } from "../../../core/utils/numbers.js";
import { isBlank, truncate } from "../../../core/utils/text.js";
import type { ProductEntity } from "../../../domain/entities.js";
import type { ProductFilter, Repositories } from "../../../domain/repositories.js";
import type { CompanyService } from "../../company/company.service.js";
import type { LeadsService } from "../../leads/leads.service.js";
import type { AgentContext, AgentEffect } from "../types.js";
import {
  TOOL_NAMES,
  companyInfoArgs,
  createLeadArgs,
  getProductArgs,
  requestContactArgs,
  searchProductsArgs,
  transferToManagerArgs,
  updateLeadArgs,
} from "./definitions.js";

export interface ToolOutcome {
  content: string;
  isError: boolean;
  effects: AgentEffect[];
}

const MAX_CARDS = 3;

function compactProduct(product: ProductEntity): Record<string, unknown> {
  return {
    id: product.id,
    name: product.name,
    price: product.price,
    price_formatted: formatPrice(product.price, product.currency),
    currency: product.currency,
    category: product.category,
    stock_status: product.stockStatus,
    attributes: product.attributes,
    has_photo: product.images.length > 0,
    description: product.description ? truncate(product.description, 300) : null,
  };
}

/**
 * Исполнитель инструментов. Ключевой инвариант: арендатор берётся
 * из AgentContext, а не из аргументов модели.
 */
export class ToolExecutor {
  constructor(
    private readonly repos: Repositories,
    private readonly company: CompanyService,
    private readonly leads: LeadsService,
  ) {}

  async execute(
    name: string,
    rawInput: Record<string, unknown>,
    ctx: AgentContext,
  ): Promise<ToolOutcome> {
    try {
      switch (name) {
        case TOOL_NAMES.SEARCH_PRODUCTS:
          return await this.searchProducts(rawInput, ctx);
        case TOOL_NAMES.GET_PRODUCT:
          return await this.getProduct(rawInput, ctx);
        case TOOL_NAMES.GET_COMPANY_INFO:
          return await this.getCompanyInfo(rawInput, ctx);
        case TOOL_NAMES.CREATE_LEAD:
          return await this.createLead(rawInput, ctx);
        case TOOL_NAMES.UPDATE_LEAD:
          return await this.updateLead(rawInput, ctx);
        case TOOL_NAMES.REQUEST_CONTACT:
          return this.requestContact(rawInput);
        case TOOL_NAMES.TRANSFER_TO_MANAGER:
          return this.transferToManager(rawInput);
        default:
          return this.fail(`Инструмент "${name}" не существует`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        const details = error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`);
        return this.fail(`Некорректные аргументы: ${details.join("; ")}`);
      }
      logger.error({ err: error, tool: name, companyId: ctx.companyId }, "Сбой инструмента AI");
      return this.fail("Внутренняя ошибка при выполнении инструмента");
    }
  }

  private async searchProducts(raw: Record<string, unknown>, ctx: AgentContext) {
    const args = searchProductsArgs.parse(raw);
    const limit = args.limit ?? 5;

    const filter: ProductFilter = { active: true, sort: "price_asc" };
    if (args.query) filter.search = args.query;
    if (args.category) filter.category = args.category;
    if (args.min_price !== undefined) filter.minPrice = args.min_price;
    if (args.max_price !== undefined) filter.maxPrice = args.max_price;
    if (args.attributes) filter.attributes = args.attributes;

    let products = await this.repos.products.search(ctx.companyId, filter, limit);

    // Мягкая деградация фильтра: сначала снимаем атрибуты, затем текстовый запрос.
    if (products.length === 0 && args.attributes) {
      const relaxed: ProductFilter = { ...filter };
      delete relaxed.attributes;
      products = await this.repos.products.search(ctx.companyId, relaxed, limit);
    }
    if (products.length === 0 && args.query) {
      const relaxed: ProductFilter = { ...filter };
      delete relaxed.search;
      delete relaxed.attributes;
      products = await this.repos.products.search(ctx.companyId, relaxed, limit);
    }

    if (products.length === 0) {
      return this.succeed(
        {
          products: [],
          count: 0,
          message:
            "В каталоге нет товаров под эти условия. Сообщи об этом клиенту честно, " +
            "предложи изменить параметры или передай диалог менеджеру.",
        },
        [],
      );
    }

    return this.succeed(
      { products: products.map(compactProduct), count: products.length },
      [{ type: "SHOW_PRODUCTS", productIds: products.slice(0, MAX_CARDS).map((p) => p.id) }],
    );
  }

  private async getProduct(raw: Record<string, unknown>, ctx: AgentContext) {
    const args = getProductArgs.parse(raw);
    const product = await this.repos.products.findById(ctx.companyId, args.product_id);
    if (!product || !product.active) {
      return this.fail("Товар не найден в каталоге компании");
    }
    return this.succeed({ product: compactProduct(product) }, [
      { type: "SHOW_PRODUCTS", productIds: [product.id] },
    ]);
  }

  private async getCompanyInfo(raw: Record<string, unknown>, ctx: AgentContext) {
    const args = companyInfoArgs.parse(raw);
    const context = await this.company.loadAiContext(ctx.companyId);
    const knowledge = context.knowledge;

    const fields: Record<string, string | null> = {
      about: knowledge?.about ?? null,
      address: knowledge?.address ?? null,
      working_hours: knowledge?.workingHours ?? null,
      delivery: knowledge?.delivery ?? null,
      payment: knowledge?.payment ?? null,
      warranty: knowledge?.warranty ?? null,
    };

    if (args.topic === "faq") {
      const faq = context.faq.map((item) => ({ question: item.question, answer: item.answer }));
      return this.succeed(
        faq.length > 0
          ? { faq }
          : { faq: [], message: "FAQ не заполнен. Не придумывай ответы — предложи менеджера." },
        [],
      );
    }

    if (args.topic === "all") {
      const filled = Object.fromEntries(
        Object.entries(fields).filter(([, value]) => !isBlank(value)),
      );
      return this.succeed(
        {
          company: { name: context.company.name, phone: context.company.phone },
          info: filled,
          faq: context.faq.slice(0, 20).map((item) => ({
            question: item.question,
            answer: item.answer,
          })),
          missing: Object.entries(fields)
            .filter(([, value]) => isBlank(value))
            .map(([key]) => key),
        },
        [],
      );
    }

    const value = fields[args.topic];
    if (isBlank(value)) {
      return this.succeed(
        {
          topic: args.topic,
          value: null,
          message:
            "Эта информация не заполнена компанией. Скажи клиенту, что уточнишь у менеджера, " +
            "и не придумывай ответ.",
        },
        [],
      );
    }
    return this.succeed({ topic: args.topic, value }, []);
  }

  private async createLead(raw: Record<string, unknown>, ctx: AgentContext) {
    const args = createLeadArgs.parse(raw);
    const lead = await this.leads.upsertFromAgent(ctx.companyId, {
      customerId: ctx.customerId,
      conversationId: ctx.conversationId,
      telegramUserId: ctx.customerExternalId,
      name: args.name ?? ctx.customerName ?? null,
      phone: args.phone ?? ctx.customerPhone ?? null,
      interest: args.interest,
      budgetMin: args.budget_min ?? null,
      budgetMax: args.budget_max ?? null,
      currency: Currency.UZS,
      interestedProductIds: args.product_ids ?? [],
      summary: args.summary ?? null,
    });

    return this.succeed(
      {
        lead_id: lead.id,
        status: lead.status,
        qualification_score: lead.qualificationScore,
        missing: this.missingLeadFields(lead.name, lead.phone),
      },
      [{ type: "LEAD_UPSERTED", leadId: lead.id, status: lead.status as LeadStatus }],
    );
  }

  private async updateLead(raw: Record<string, unknown>, ctx: AgentContext) {
    const args = updateLeadArgs.parse(raw);
    const lead = await this.leads.upsertFromAgent(ctx.companyId, {
      customerId: ctx.customerId,
      conversationId: ctx.conversationId,
      telegramUserId: ctx.customerExternalId,
      ...(args.name !== undefined ? { name: args.name } : {}),
      ...(args.phone !== undefined ? { phone: args.phone } : {}),
      ...(args.interest !== undefined ? { interest: args.interest } : {}),
      ...(args.budget_min !== undefined ? { budgetMin: args.budget_min } : {}),
      ...(args.budget_max !== undefined ? { budgetMax: args.budget_max } : {}),
      ...(args.product_ids !== undefined ? { interestedProductIds: args.product_ids } : {}),
      ...(args.summary !== undefined ? { summary: args.summary } : {}),
    });

    return this.succeed(
      {
        lead_id: lead.id,
        status: lead.status,
        qualification_score: lead.qualificationScore,
        missing: this.missingLeadFields(lead.name, lead.phone),
      },
      [{ type: "LEAD_UPSERTED", leadId: lead.id, status: lead.status as LeadStatus }],
    );
  }

  private requestContact(raw: Record<string, unknown>): ToolOutcome {
    const args = requestContactArgs.parse(raw);
    return this.succeed(
      {
        requested: true,
        message: "Клиенту показана кнопка отправки номера. Поблагодари и дождись номера.",
      },
      [{ type: "REQUEST_CONTACT", reason: args.reason }],
    );
  }

  private transferToManager(raw: Record<string, unknown>): ToolOutcome {
    const args = transferToManagerArgs.parse(raw);
    return this.succeed(
      {
        transferred: true,
        message: "Диалог передан менеджеру. Сообщи клиенту, что менеджер скоро ответит.",
      },
      [{ type: "TRANSFER_TO_MANAGER", reason: args.reason, urgency: args.urgency }],
    );
  }

  private missingLeadFields(name: string | null, phone: string | null): string[] {
    const missing: string[] = [];
    if (!name) missing.push("name");
    if (!phone) missing.push("phone");
    return missing;
  }

  private succeed(payload: unknown, effects: AgentEffect[]): ToolOutcome {
    return { content: JSON.stringify(payload), isError: false, effects };
  }

  private fail(message: string): ToolOutcome {
    return { content: JSON.stringify({ error: message }), isError: true, effects: [] };
  }
}