import { z } from "zod";
import type { LlmToolDefinition } from "../llm.client.js";

const MAX_MONEY = 1_000_000_000_000;

/**
 * Схемы инструментов для модели (JSON Schema) и для валидации аргументов (Zod).
 * companyId, conversationId и customerId сюда не входят намеренно:
 * их подставляет исполнитель из контекста запроса, а не модель.
 */

const FORBIDDEN_ATTRIBUTE_KEYS = ["__proto__", "constructor", "prototype"];

export const searchProductsArgs = z.object({
  query: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  min_price: z.number().min(0).max(MAX_MONEY).optional(),
  max_price: z.number().min(0).max(MAX_MONEY).optional(),
  attributes: z
    .record(z.union([z.string().max(200), z.number(), z.boolean()]))
    .refine(
      (value) => Object.keys(value).every((key) => !FORBIDDEN_ATTRIBUTE_KEYS.includes(key)),
      "Недопустимое имя атрибута",
    )
    .optional(),
  limit: z.number().int().min(1).max(8).optional(),
});

export const getProductArgs = z.object({
  product_id: z.string().min(1).max(100),
});

export const companyInfoArgs = z.object({
  topic: z
    .enum(["about", "address", "working_hours", "delivery", "payment", "warranty", "faq", "all"])
    .default("all"),
});

const leadFields = {
  name: z.string().trim().max(200).optional(),
  phone: z.string().trim().max(30).optional(),
  interest: z.string().trim().max(1000).optional(),
  budget_min: z.number().min(0).max(MAX_MONEY).optional(),
  budget_max: z.number().min(0).max(MAX_MONEY).optional(),
  product_ids: z.array(z.string().min(1).max(100)).max(10).optional(),
  summary: z.string().trim().max(1000).optional(),
};

export const createLeadArgs = z.object({
  ...leadFields,
  interest: z.string().trim().min(1, "Опишите интерес клиента").max(1000),
});

export const updateLeadArgs = z.object({
  lead_id: z.string().min(1).max(100).optional(),
  ...leadFields,
});

export const requestContactArgs = z.object({
  reason: z.string().trim().max(300).default("Чтобы менеджер мог связаться с вами"),
});

export const transferToManagerArgs = z.object({
  reason: z.string().trim().min(1, "Укажите причину").max(500),
  urgency: z.enum(["low", "normal", "high"]).default("normal"),
});

export const TOOL_NAMES = {
  SEARCH_PRODUCTS: "search_products",
  GET_PRODUCT: "get_product",
  GET_COMPANY_INFO: "get_company_info",
  CREATE_LEAD: "create_lead",
  UPDATE_LEAD: "update_lead",
  REQUEST_CONTACT: "request_contact",
  TRANSFER_TO_MANAGER: "transfer_to_manager",
} as const;

export const TOOL_DEFINITIONS: LlmToolDefinition[] = [
  {
    name: TOOL_NAMES.SEARCH_PRODUCTS,
    description:
      "Найти товары в каталоге компании. Единственный источник товаров и цен. " +
      "Вызывай перед тем, как называть любой товар или цену. " +
      "Если результат пустой — товара нет, придумывать замену нельзя.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: "Ключевые слова: «угловой диван», «шкаф-купе»" },
        category: { type: "string", description: "Категория, например «Диваны»" },
        min_price: { type: "number", description: "Минимальная цена в валюте каталога" },
        max_price: { type: "number", description: "Максимальная цена, например 8000000" },
        attributes: {
          type: "object",
          description: "Точные значения атрибутов: {\"color\": \"серый\", \"material\": \"рогожка\"}",
          additionalProperties: true,
        },
        limit: { type: "integer", description: "Сколько товаров вернуть, 1–8 (по умолчанию 5)" },
      },
      required: [],
    },
  },
  {
    name: TOOL_NAMES.GET_PRODUCT,
    description: "Получить полную карточку товара по его id из результатов search_products.",
    input_schema: {
      type: "object",
      properties: { product_id: { type: "string", description: "id товара" } },
      required: ["product_id"],
    },
  },
  {
    name: TOOL_NAMES.GET_COMPANY_INFO,
    description:
      "Получить сведения о компании: адрес, график, доставка, оплата, гарантия, FAQ. " +
      "Единственный источник таких ответов. Если поле пустое — информации нет.",
    input_schema: {
      type: "object",
      properties: {
        topic: {
          type: "string",
          enum: ["about", "address", "working_hours", "delivery", "payment", "warranty", "faq", "all"],
          description: "Какой раздел нужен",
        },
      },
      required: ["topic"],
    },
  },
  {
    name: TOOL_NAMES.CREATE_LEAD,
    description:
      "Создать лид, когда клиент проявил интерес к покупке. Вызывай один раз за диалог; " +
      "далее используй update_lead.",
    input_schema: {
      type: "object",
      properties: {
        interest: { type: "string", description: "Что нужно клиенту, своими словами" },
        name: { type: "string", description: "Имя клиента, если он его назвал" },
        phone: { type: "string", description: "Телефон, если клиент его дал" },
        budget_min: { type: "number", description: "Нижняя граница бюджета" },
        budget_max: { type: "number", description: "Верхняя граница бюджета" },
        product_ids: {
          type: "array",
          items: { type: "string" },
          description: "id товаров, которые заинтересовали клиента",
        },
        summary: { type: "string", description: "Краткая сводка диалога для менеджера" },
      },
      required: ["interest"],
    },
  },
  {
    name: TOOL_NAMES.UPDATE_LEAD,
    description: "Дополнить существующий лид новыми данными: телефон, имя, бюджет, товары.",
    input_schema: {
      type: "object",
      properties: {
        lead_id: { type: "string", description: "id лида; можно не указывать — возьмётся текущий" },
        name: { type: "string" },
        phone: { type: "string" },
        interest: { type: "string" },
        budget_min: { type: "number" },
        budget_max: { type: "number" },
        product_ids: { type: "array", items: { type: "string" } },
        summary: { type: "string" },
      },
      required: [],
    },
  },
  {
    name: TOOL_NAMES.REQUEST_CONTACT,
    description:
      "Попросить клиента отправить номер телефона кнопкой в мессенджере. " +
      "Вызывай, когда клиент готов продолжить разговор с менеджером или оформить заказ.",
    input_schema: {
      type: "object",
      properties: { reason: { type: "string", description: "Зачем нужен номер" } },
      required: [],
    },
  },
  {
    name: TOOL_NAMES.TRANSFER_TO_MANAGER,
    description:
      "Передать диалог живому менеджеру: клиент просит человека, торгуется, жалуется " +
      "или задаёт вопрос, на который нет данных.",
    input_schema: {
      type: "object",
      properties: {
        reason: { type: "string", description: "Причина передачи" },
        urgency: { type: "string", enum: ["low", "normal", "high"] },
      },
      required: ["reason"],
    },
  },
];