import { describe, expect, it } from "vitest";
import { Currency, Language, LeadSource, LeadStatus } from "@ai-sales/shared";
import type { AiSettingsEntity, LeadEntity } from "../../src/domain/entities.js";
import { buildSystemPrompt } from "../../src/modules/ai/prompt.builder.js";

const company = {
  id: "cmp_1",
  name: "Mebel Style",
  slug: "mebel-style",
  phone: "+998901234567",
  status: "ACTIVE" as const,
  defaultLanguage: Language.RU,
  createdAt: new Date("2026-08-01T00:00:00.000Z").toISOString(),
};

const settings: AiSettingsEntity = {
  companyId: "cmp_1",
  enabled: true,
  assistantName: "Малика",
  tone: "Тёплый, без навязчивости",
  greeting: null,
  systemInstructions: "Всегда предлагай замер бесплатно.",
  autoCreateLead: true,
  model: "gpt-4.1-mini",
  temperature: 0.3,
  maxTokens: 1024,
};

const knowledge = {
  companyId: "cmp_1",
  about: "Мебельный салон в Ташкенте",
  address: "Ташкент, Чиланзар, 12",
  workingHours: "Пн–Сб 10:00–20:00",
  delivery: "Доставка по Ташкенту бесплатно от 5 млн",
  payment: "Наличные, карта, рассрочка 6 месяцев",
  warranty: "Гарантия 18 месяцев",
  managerInstructions: "Уточняй размеры комнаты",
  updatedAt: new Date("2026-08-10T00:00:00.000Z"),
};

const faq = [
  { id: "faq_1", companyId: "cmp_1", question: "Есть ли подъём на этаж?", answer: "Да, бесплатно до 5 этажа", position: 0, active: true },
];

describe("buildSystemPrompt", () => {
  it("подставляет имя ассистента и компании", () => {
    const prompt = buildSystemPrompt({
      company,
      knowledge,
      faq,
      settings,
      language: Language.RU,
      lead: null,
      customerName: "Дилшод",
    });

    expect(prompt).toContain("Малика");
    expect(prompt).toContain("Mebel Style");
    expect(prompt).toContain("Дилшод");
  });

  it("включает базу знаний и FAQ", () => {
    const prompt = buildSystemPrompt({
      company,
      knowledge,
      faq,
      settings,
      language: Language.RU,
      lead: null,
      customerName: null,
    });

    expect(prompt).toContain("Ташкент, Чиланзар, 12");
    expect(prompt).toContain("Гарантия 18 месяцев");
    expect(prompt).toContain("Есть ли подъём на этаж?");
    expect(prompt).toContain("Всегда предлагай замер бесплатно.");
  });

  it("содержит запрет на выдуманные данные", () => {
    const prompt = buildSystemPrompt({
      company,
      knowledge,
      faq,
      settings,
      language: Language.RU,
      lead: null,
      customerName: null,
    });

    expect(prompt).toContain("Никогда не называй товар, цену");
    expect(prompt).toContain("search_products");
  });

  it("переключает языковое правило", () => {
    const uz = buildSystemPrompt({
      company,
      knowledge,
      faq,
      settings,
      language: Language.UZ,
      lead: null,
      customerName: null,
    });
    expect(uz).toContain("o'zbek tilida");
  });

  it("пропускает незаполненные разделы", () => {
    const prompt = buildSystemPrompt({
      company: { ...company, phone: null },
      knowledge: null,
      faq: [],
      settings: { ...settings, systemInstructions: null },
      language: Language.RU,
      lead: null,
      customerName: null,
    });

    expect(prompt).not.toContain("Частые вопросы");
    expect(prompt).not.toContain("Адрес:");
  });

  it("перечисляет уже известные данные лида", () => {
    const lead: LeadEntity = {
      id: "led_1",
      companyId: "cmp_1",
      customerId: "cus_1",
      conversationId: "cnv_1",
      name: "Дилшод",
      phone: "+998901234567",
      telegramUserId: "555",
      source: LeadSource.TELEGRAM,
      interest: "Угловой диван",
      budgetMin: null,
      budgetMax: 8_000_000,
      currency: Currency.UZS,
      status: LeadStatus.QUALIFIED,
      aiSummary: null,
      qualificationScore: 85,
      interestedProductIds: [],
      assignedManagerId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      contactedAt: null,
      closedAt: null,
    };

    const prompt = buildSystemPrompt({
      company,
      knowledge,
      faq,
      settings,
      language: Language.RU,
      lead,
      customerName: "Дилшод",
    });

    expect(prompt).toContain("не переспрашивай");
    expect(prompt).toContain("+998901234567");
    expect(prompt).toContain("led_1");
  });
});