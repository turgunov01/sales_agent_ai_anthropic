import { beforeEach, describe, expect, it } from "vitest";
import { ChannelType, Currency, Language, StockStatus } from "@ai-sales/shared";
import type { Repositories } from "../../src/domain/repositories.js";
import { CompanyService } from "../../src/modules/company/company.service.js";
import { LeadsService } from "../../src/modules/leads/leads.service.js";
import { ToolExecutor } from "../../src/modules/ai/tools/executor.js";
import type { AgentContext } from "../../src/modules/ai/types.js";
import { FakeStore, createFakeRepositories } from "../helpers/fake-store.js";

let store: FakeStore;
let repos: Repositories;
let executor: ToolExecutor;
let leads: LeadsService;
let ctx: AgentContext;
let companyId: string;
let otherCompanyId: string;

async function seedProduct(
  targetCompanyId: string,
  name: string,
  price: number,
  attributes: Record<string, string> = {},
): Promise<string> {
  const product = await repos.products.create(targetCompanyId, {
    externalId: null,
    name,
    description: "Описание",
    category: "Диваны",
    price,
    currency: Currency.UZS,
    images: [],
    attributes,
    stockStatus: StockStatus.IN_STOCK,
    active: true,
  });
  return product.id;
}

function parse(content: string): Record<string, unknown> {
  return JSON.parse(content) as Record<string, unknown>;
}

beforeEach(async () => {
  store = new FakeStore();
  repos = createFakeRepositories(store);

  const created = await repos.companies.createWithOwner({
    company: { name: "Mebel Style", slug: "mebel-style", phone: null, defaultLanguage: Language.RU },
    owner: { email: "owner@mebelstyle.uz", passwordHash: "scrypt$x", fullName: "Владелец" },
  });
  companyId = created.company.id;

  const other = await repos.companies.createWithOwner({
    company: { name: "Другая", slug: "drugaya", phone: null, defaultLanguage: Language.RU },
    owner: { email: "owner@other.uz", passwordHash: "scrypt$x", fullName: "Владелец" },
  });
  otherCompanyId = other.company.id;

  const customer = await repos.customers.upsert(companyId, {
    channelType: ChannelType.TELEGRAM,
    externalId: "555000111",
    firstName: "Дилшод",
    lastName: null,
    username: null,
    language: Language.RU,
  });

  const channel = await repos.channels.upsertByType(companyId, {
    type: ChannelType.TELEGRAM,
    botUsername: "bot",
    botExternalId: "1",
    botTokenCiphertext: "v1:x:y:z",
    webhookSecret: "secret",
    isActive: true,
    lastConnectedAt: null,
  });

  const conversation = await repos.conversations.create(companyId, {
    customerId: customer.id,
    channelId: channel.id,
    language: Language.RU,
  });

  const company = new CompanyService(repos);
  leads = new LeadsService(repos, () => store.now());
  executor = new ToolExecutor(repos, company, leads);

  ctx = {
    companyId,
    conversationId: conversation.id,
    customerId: customer.id,
    customerExternalId: customer.externalId,
    customerName: "Дилшод",
    customerPhone: null,
    language: Language.RU,
  };
});

describe("search_products", () => {
  it("возвращает только товары своей компании в рамках бюджета", async () => {
    await seedProduct(companyId, "Диван Милан", 7_500_000);
    await seedProduct(companyId, "Диван Прага", 9_800_000);
    await seedProduct(otherCompanyId, "Чужой диван", 6_000_000);

    const outcome = await executor.execute("search_products", { max_price: 8_000_000 }, ctx);
    const payload = parse(outcome.content);

    expect(outcome.isError).toBe(false);
    expect(payload.count).toBe(1);
    expect(JSON.stringify(payload)).toContain("Диван Милан");
    expect(JSON.stringify(payload)).not.toContain("Чужой диван");
  });

  it("форматирует цену так, как её увидит клиент", async () => {
    await seedProduct(companyId, "Диван Милан", 7_500_000);
    const outcome = await executor.execute("search_products", {}, ctx);
    expect(outcome.content).toContain("7 500 000 сум");
  });

  it("порождает эффект показа карточек, но не больше трёх", async () => {
    for (let index = 0; index < 5; index += 1) {
      await seedProduct(companyId, `Диван ${index}`, 1_000_000 + index);
    }

    const outcome = await executor.execute("search_products", { limit: 5 }, ctx);
    const effect = outcome.effects[0];
    expect(effect?.type).toBe("SHOW_PRODUCTS");
    expect(effect?.type === "SHOW_PRODUCTS" && effect.productIds).toHaveLength(3);
  });

  it("ослабляет фильтр атрибутов, если точного совпадения нет", async () => {
    await seedProduct(companyId, "Диван Милан", 7_500_000, { color: "Серый" });

    const outcome = await executor.execute(
      "search_products",
      { attributes: { color: "Розовый" } },
      ctx,
    );
    expect(parse(outcome.content).count).toBe(1);
  });

  it("честно сообщает о пустом каталоге вместо выдумки", async () => {
    const outcome = await executor.execute("search_products", { query: "кровать" }, ctx);
    const payload = parse(outcome.content);

    expect(payload.count).toBe(0);
    expect(String(payload.message)).toContain("нет товаров");
  });

  it("отклоняет некорректные аргументы", async () => {
    const outcome = await executor.execute("search_products", { limit: 99 }, ctx);
    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain("Некорректные аргументы");
  });
});

describe("get_product", () => {
  it("отдаёт карточку своего товара", async () => {
    const productId = await seedProduct(companyId, "Диван Милан", 7_500_000);
    const outcome = await executor.execute("get_product", { product_id: productId }, ctx);

    expect(outcome.isError).toBe(false);
    expect(outcome.content).toContain("Диван Милан");
    expect(outcome.effects[0]?.type).toBe("SHOW_PRODUCTS");
  });

  it("не отдаёт чужой товар", async () => {
    const foreignId = await seedProduct(otherCompanyId, "Чужой диван", 6_000_000);
    const outcome = await executor.execute("get_product", { product_id: foreignId }, ctx);

    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain("не найден");
  });

  it("не отдаёт снятый с продажи товар", async () => {
    const productId = await seedProduct(companyId, "Диван Милан", 7_500_000);
    await repos.products.softDelete(companyId, productId);

    const outcome = await executor.execute("get_product", { product_id: productId }, ctx);
    expect(outcome.isError).toBe(true);
  });
});

describe("get_company_info", () => {
  it("сообщает, что раздел не заполнен, вместо выдумки", async () => {
    const outcome = await executor.execute("get_company_info", { topic: "delivery" }, ctx);
    const payload = parse(outcome.content);

    expect(payload.value).toBeNull();
    expect(String(payload.message)).toContain("не заполнена");
  });

  it("возвращает заполненный раздел", async () => {
    await repos.knowledge.upsertKnowledge(companyId, {
      about: null,
      address: "Ташкент, Чиланзар, 12",
      workingHours: null,
      delivery: "Бесплатно от 5 млн",
      payment: null,
      warranty: null,
      managerInstructions: null,
    });

    const outcome = await executor.execute("get_company_info", { topic: "delivery" }, ctx);
    expect(parse(outcome.content).value).toBe("Бесплатно от 5 млн");
  });

  it("перечисляет незаполненные разделы в режиме all", async () => {
    const outcome = await executor.execute("get_company_info", { topic: "all" }, ctx);
    const payload = parse(outcome.content) as { missing: string[] };
    expect(payload.missing).toContain("delivery");
  });

  it("честно отвечает про пустой FAQ", async () => {
    const outcome = await executor.execute("get_company_info", { topic: "faq" }, ctx);
    expect(String(parse(outcome.content).message)).toContain("не заполнен");
  });

  it("отдаёт FAQ компании", async () => {
    await repos.knowledge.createFaq(companyId, {
      question: "Есть подъём на этаж?",
      answer: "Да, бесплатно",
      position: 0,
      active: true,
    });

    const outcome = await executor.execute("get_company_info", { topic: "faq" }, ctx);
    expect(outcome.content).toContain("Есть подъём на этаж?");
  });
});

describe("лиды через инструменты", () => {
  it("создаёт лид и сообщает, каких данных не хватает", async () => {
    const outcome = await executor.execute(
      "create_lead",
      { interest: "Угловой диван до 8 млн", budget_max: 8_000_000 },
      ctx,
    );
    const payload = parse(outcome.content) as { status: string; missing: string[] };

    expect(payload.status).toBe("NEW");
    expect(payload.missing).toContain("phone");
    expect(outcome.effects[0]?.type).toBe("LEAD_UPSERTED");
  });

  it("дополняет лид телефоном и квалифицирует его", async () => {
    await executor.execute("create_lead", { interest: "Угловой диван" }, ctx);
    const outcome = await executor.execute("update_lead", { phone: "901234567" }, ctx);
    const payload = parse(outcome.content) as { status: string; qualification_score: number };

    expect(payload.status).toBe("QUALIFIED");
    expect(payload.qualification_score).toBeGreaterThanOrEqual(60);
    expect(store.leads).toHaveLength(1);
  });

  it("требует описание интереса при создании лида", async () => {
    const outcome = await executor.execute("create_lead", {}, ctx);
    expect(outcome.isError).toBe(true);
  });
});

describe("прочие инструменты", () => {
  it("request_contact порождает эффект с кнопкой", async () => {
    const outcome = await executor.execute("request_contact", {}, ctx);
    expect(outcome.effects[0]).toEqual({
      type: "REQUEST_CONTACT",
      reason: "Чтобы менеджер мог связаться с вами",
    });
  });

  it("transfer_to_manager передаёт причину и срочность по умолчанию", async () => {
    const outcome = await executor.execute(
      "transfer_to_manager",
      { reason: "Клиент просит человека" },
      ctx,
    );

    expect(outcome.effects[0]).toEqual({
      type: "TRANSFER_TO_MANAGER",
      reason: "Клиент просит человека",
      urgency: "normal",
    });
  });

  it("сообщает модели о несуществующем инструменте", async () => {
    const outcome = await executor.execute("delete_everything", {}, ctx);
    expect(outcome.isError).toBe(true);
    expect(outcome.content).toContain("не существует");
  });
});