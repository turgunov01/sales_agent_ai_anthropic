import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import {
  auth,
  connectTelegram,
  createTestContext,
  registerCompany,
  sendTelegramUpdate,
  telegramTextUpdate,
  type TestContext,
} from "../helpers/test-app.js";
import { textResponse, toolUseResponse } from "../helpers/fake-llm.js";
import type { LlmToolResultBlock } from "../../src/modules/ai/llm.client.js";

/** Содержимое tool_result, отправленного модели на указанной итерации. */
function toolResultAt(context: TestContext, requestIndex: number): string {
  const blocks = context.llm.requests[requestIndex]?.messages.at(-1)?.content;
  if (!Array.isArray(blocks)) return "";
  return (blocks as LlmToolResultBlock[]).map((block) => block.content ?? "").join("\n");
}

const CATALOG_CSV = [
  "external_id,name,category,price,currency,stock_status,images,material,color",
  "SF-001,Диван «Милан»,Диваны,7500000,UZS,IN_STOCK,https://cdn.uz/milan.jpg,Рогожка,Серый",
  "SF-002,Диван Осло,Диваны,5900000,UZS,IN_STOCK,,Велюр,Бежевый",
  "SF-003,Диван Прага,Диваны,9800000,UZS,IN_STOCK,,Кожа,Чёрный",
].join("\n");

let context: TestContext;
let owner: Awaited<ReturnType<typeof registerCompany>>;
let channel: Awaited<ReturnType<typeof connectTelegram>>;

beforeEach(async () => {
  context = createTestContext();
  owner = await registerCompany(context.app);

  await request(context.app)
    .post("/api/v1/products/import")
    .set(auth(owner.accessToken))
    .set("Content-Type", "text/csv")
    .send(CATALOG_CSV);

  await request(context.app)
    .put("/api/v1/company/knowledge")
    .set(auth(owner.accessToken))
    .send({
      about: "Мебельный салон в Ташкенте",
      address: "Ташкент, Чиланзар, 12",
      workingHours: "Пн–Сб 10:00–20:00",
      delivery: "Бесплатная доставка по Ташкенту от 5 млн",
      payment: "Наличные, карта, рассрочка",
      warranty: "Гарантия 18 месяцев",
      managerInstructions: null,
    });

  channel = await connectTelegram(context, owner.accessToken);
  context.telegram.reset();
});

describe("подключение Telegram-бота", () => {
  it("проверяет токен и регистрирует webhook", async () => {
    const fresh = createTestContext();
    const freshOwner = await registerCompany(fresh.app);
    const connected = await connectTelegram(fresh, freshOwner.accessToken);

    const methods = fresh.telegram.calls.map((call) => call.method);
    expect(methods).toContain("getMe");
    expect(methods).toContain("setWebhook");

    const setWebhook = fresh.telegram.calls.find((call) => call.method === "setWebhook");
    expect((setWebhook?.payload as { url: string }).url).toBe(
      `https://api.test.local/api/v1/webhooks/telegram/${connected.channelId}`,
    );
  });

  it("не отдаёт токен бота наружу", async () => {
    const response = await request(context.app)
      .get("/api/v1/channels")
      .set(auth(owner.accessToken));

    expect(response.body.data[0].maskedToken).toBe("123456789:AAE***");
    expect(JSON.stringify(response.body)).not.toContain("DEMOtokenXYZ");
  });

  it("хранит токен зашифрованным", () => {
    const stored = context.store.channels[0];
    expect(stored?.botTokenCiphertext.startsWith("v1:")).toBe(true);
    expect(stored?.botTokenCiphertext).not.toContain("DEMOtokenXYZ");
  });

  it("отклоняет токен неверного формата", async () => {
    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(owner.accessToken))
      .send({ botToken: "мусор" });

    expect(response.status).toBe(400);
  });
});

describe("вебхук", () => {
  it("игнорирует апдейт с неверным секретом", async () => {
    await request(context.app)
      .post(`/api/v1/webhooks/telegram/${channel.channelId}`)
      .set("X-Telegram-Bot-Api-Secret-Token", "forged-secret")
      .send(telegramTextUpdate("Привет", { updateId: 1 }));
    await context.queue.whenIdle();

    expect(context.store.messages).toHaveLength(0);
    expect(context.llm.requests).toHaveLength(0);
  });

  it("отвечает 200 на неизвестный канал, не раскрывая его существование", async () => {
    const response = await request(context.app)
      .post("/api/v1/webhooks/telegram/chn_missing")
      .set("X-Telegram-Bot-Api-Secret-Token", "any-secret")
      .send(telegramTextUpdate("Привет", { updateId: 2 }));

    expect(response.status).toBe(200);
    expect(context.store.conversations).toHaveLength(0);
  });

  it("не обрабатывает один и тот же update_id дважды", async () => {
    context.llm.script(textResponse("Здравствуйте!"), textResponse("Здравствуйте!"));

    const update = telegramTextUpdate("Привет", { updateId: 42 });
    await sendTelegramUpdate(context, channel, update);
    await sendTelegramUpdate(context, channel, update);

    expect(context.llm.requests).toHaveLength(1);
  });
});

describe("сценарий «Мне нужен диван до 8 млн»", () => {
  it("проходит путь от сообщения до квалифицированного лида", async () => {
    context.llm.script(
      toolUseResponse("search_products", { query: "диван", max_price: 8_000_000 }, { id: "t1" }),
      toolUseResponse(
        "create_lead",
        { interest: "Угловой диван до 8 млн", budget_max: 8_000_000, summary: "Клиент ищет диван" },
        { id: "t2" },
      ),
      toolUseResponse(
        "request_contact",
        { reason: "Чтобы менеджер связался" },
        { id: "t3", text: "Подобрал два варианта в вашем бюджете." },
      ),
      textResponse("Оставьте номер, и менеджер свяжется с вами."),
    );

    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("Мне нужен диван до 8 млн", { updateId: 100 }),
    );

    // 1. Диалог и сообщения сохранены
    expect(context.store.conversations).toHaveLength(1);
    const roles = context.store.messages.map((message) => message.role);
    expect(roles).toEqual(["CUSTOMER", "ASSISTANT"]);

    // 2. Инструмент получил фильтр по цене и вернул только подходящие товары
    const toolResult = toolResultAt(context, 1);
    expect(toolResult).toContain("Диван «Милан»");
    expect(toolResult).toContain("Диван Осло");
    expect(toolResult).not.toContain("Диван Прага");

    // 3. Клиенту ушёл текст, карточки товаров и кнопка контакта
    const texts = context.telegram.sentMessages.map((message) => message.text);
    expect(texts[0]).toBe("Оставьте номер, и менеджер свяжется с вами.");
    // Товар с фото уходит карточкой sendPhoto, без фото — обычным сообщением.
    expect(context.telegram.sentPhotos[0]?.caption).toContain("Диван «Милан»");
    expect(context.telegram.sentPhotos[0]?.caption).toContain("7 500 000 сум");
    expect(texts.some((text) => text.includes("Диван Осло"))).toBe(true);
    expect(texts.some((text) => text.includes("5 900 000 сум"))).toBe(true);
    expect(context.telegram.sentMessages.at(-1)?.requestContactButton).toBeTruthy();

    // 4. Лид создан, но ещё не квалифицирован — нет телефона
    expect(context.store.leads).toHaveLength(1);
    const lead = context.store.leads[0];
    expect(lead?.status).toBe("NEW");
    expect(lead?.interest).toBe("Угловой диван до 8 млн");
    expect(lead?.budgetMax).toBe(8_000_000);

    // 5. Клиент отправляет контакт — лид становится QUALIFIED
    context.llm.script(textResponse("Спасибо! Менеджер свяжется с вами в течение часа."));
    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("", { updateId: 101, contactPhone: "+998901234567" }),
    );

    const qualified = context.store.leads[0];
    expect(context.store.leads).toHaveLength(1);
    expect(qualified?.phone).toBe("+998901234567");
    expect(qualified?.status).toBe("QUALIFIED");
    expect(qualified?.qualificationScore).toBeGreaterThanOrEqual(60);
    expect(context.store.customers[0]?.phone).toBe("+998901234567");

    // 6. Лид виден в админке
    const leads = await request(context.app)
      .get("/api/v1/leads?status=QUALIFIED")
      .set(auth(owner.accessToken));
    expect(leads.body.data).toHaveLength(1);
    expect(leads.body.data[0].telegramUserId).toBe("555000111");
  });

  it("system prompt содержит базу знаний и не содержит каталог", async () => {
    context.llm.script(textResponse("Здравствуйте!"));
    await sendTelegramUpdate(context, channel, telegramTextUpdate("Привет", { updateId: 110 }));

    const system = context.llm.requests[0]?.system ?? "";
    expect(system).toContain("Ташкент, Чиланзар, 12");
    expect(system).toContain("Гарантия 18 месяцев");
    expect(system).not.toContain("Диван Прага");
  });

  it("определяет узбекский язык и сохраняет его в диалоге", async () => {
    context.llm.script(textResponse("Salom! Sizga qanday yordam bera olaman?"));
    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("Salom, menga divan kerak", { updateId: 120 }),
    );

    expect(context.store.conversations[0]?.language).toBe("UZ");
    expect(context.store.customers[0]?.language).toBe("UZ");
  });

  it("передаёт диалог менеджеру по запросу модели", async () => {
    context.llm.script(
      toolUseResponse(
        "transfer_to_manager",
        { reason: "Клиент просит человека", urgency: "high" },
        { id: "t9" },
      ),
      textResponse("Передаю вас менеджеру."),
    );

    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("Хочу поговорить с человеком", { updateId: 130 }),
    );

    expect(context.store.conversations[0]?.status).toBe("HANDOFF_REQUESTED");
    expect(context.store.conversations[0]?.handoffReason).toBe("Клиент просит человека");
  });

  it("честно отвечает, когда каталог пуст", async () => {
    context.store.products = [];
    context.llm.script(
      toolUseResponse("search_products", { query: "кровать" }, { id: "t10" }),
      textResponse("К сожалению, кроватей сейчас нет. Могу передать вопрос менеджеру."),
    );

    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("Нужна кровать", { updateId: 140 }),
    );

    const toolResult = toolResultAt(context, 1);
    expect(toolResult).toContain('"count":0');
    expect(toolResult).toContain("нет товаров под эти условия");
    expect(context.telegram.sentPhotos).toHaveLength(0);
  });
});

describe("отказоустойчивость и ручной режим", () => {
  it("при недоступной модели отвечает честно и зовёт менеджера", async () => {
    context.llm.failWith(new Error("Claude недоступен"));

    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("Мне нужен диван", { updateId: 200 }),
    );

    const reply = context.telegram.sentMessages[0]?.text ?? "";
    expect(reply).toContain("менеджер");
    expect(context.store.conversations[0]?.status).toBe("HANDOFF_REQUESTED");
  });

  it("молчит, когда AI выключен в настройках", async () => {
    await request(context.app)
      .put("/api/v1/company/ai-settings")
      .set(auth(owner.accessToken))
      .send({ enabled: false });

    await sendTelegramUpdate(
      context,
      channel,
      telegramTextUpdate("Мне нужен диван", { updateId: 210 }),
    );

    expect(context.telegram.sentMessages).toHaveLength(0);
    expect(context.store.messages).toHaveLength(1);
    expect(context.store.messages[0]?.role).toBe("CUSTOMER");
  });

  it("после перехвата менеджером AI не отвечает", async () => {
    context.llm.script(textResponse("Здравствуйте!"));
    await sendTelegramUpdate(context, channel, telegramTextUpdate("Привет", { updateId: 220 }));

    const conversationId = context.store.conversations[0]?.id ?? "";
    const takeover = await request(context.app)
      .post(`/api/v1/conversations/${conversationId}/takeover`)
      .set(auth(owner.accessToken));
    expect(takeover.status).toBe(200);

    const requestsBefore = context.llm.requests.length;
    await sendTelegramUpdate(context, channel, telegramTextUpdate("Ещё вопрос", { updateId: 221 }));
    expect(context.llm.requests).toHaveLength(requestsBefore);

    const sent = await request(context.app)
      .post(`/api/v1/conversations/${conversationId}/messages`)
      .set(auth(owner.accessToken))
      .send({ text: "Здравствуйте, это менеджер Малика." });
    expect(sent.status).toBe(201);
    expect(context.telegram.sentMessages.at(-1)?.text).toBe("Здравствуйте, это менеджер Малика.");

    const released = await request(context.app)
      .post(`/api/v1/conversations/${conversationId}/release`)
      .set(auth(owner.accessToken));
    expect(released.body.data.status).toBe("ACTIVE");
  });

  it("показывает диалог и историю в админке", async () => {
    context.llm.script(textResponse("Здравствуйте!"));
    await sendTelegramUpdate(context, channel, telegramTextUpdate("Привет", { updateId: 230 }));

    const list = await request(context.app)
      .get("/api/v1/conversations")
      .set(auth(owner.accessToken));
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0].customer.externalId).toBe("555000111");

    const messages = await request(context.app)
      .get(`/api/v1/conversations/${list.body.data[0].id}/messages`)
      .set(auth(owner.accessToken));
    expect(messages.body.data).toHaveLength(2);
  });
});