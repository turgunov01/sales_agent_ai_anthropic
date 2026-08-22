import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import {
  auth,
  connectTelegram,
  createTestContext,
  registerCompany,
  type TestContext,
} from "../helpers/test-app.js";

let context: TestContext;
let owner: Awaited<ReturnType<typeof registerCompany>>;

beforeEach(async () => {
  context = createTestContext();
  owner = await registerCompany(context.app);
});

describe("профиль компании", () => {
  it("отдаёт и обновляет профиль", async () => {
    const profile = await request(context.app).get("/api/v1/company").set(auth(owner.accessToken));
    expect(profile.body.data.name).toBe("Mebel Style");

    const updated = await request(context.app)
      .patch("/api/v1/company")
      .set(auth(owner.accessToken))
      .send({ name: "Mebel Style Premium", phone: "901112233", defaultLanguage: "UZ" });

    expect(updated.body.data.name).toBe("Mebel Style Premium");
    expect(updated.body.data.phone).toBe("+998901112233");
    expect(updated.body.data.defaultLanguage).toBe("UZ");
  });

  it("отклоняет пустое обновление", async () => {
    const response = await request(context.app)
      .patch("/api/v1/company")
      .set(auth(owner.accessToken))
      .send({});

    expect(response.status).toBe(400);
  });
});

describe("база знаний", () => {
  it("сохраняет и возвращает разделы", async () => {
    const saved = await request(context.app)
      .put("/api/v1/company/knowledge")
      .set(auth(owner.accessToken))
      .send({
        about: "Мебельный салон",
        address: "Ташкент, Чиланзар, 12",
        workingHours: "Пн–Сб 10:00–20:00",
        delivery: "Бесплатно от 5 млн",
        payment: "Наличные, карта",
        warranty: "18 месяцев",
        managerInstructions: "Уточняй размеры",
      });

    expect(saved.status).toBe(200);
    expect(saved.body.data.address).toBe("Ташкент, Чиланзар, 12");

    const loaded = await request(context.app)
      .get("/api/v1/company/knowledge")
      .set(auth(owner.accessToken));
    expect(loaded.body.data.warranty).toBe("18 месяцев");
  });

  it("возвращает пустую базу знаний без ошибки", async () => {
    const response = await request(context.app)
      .get("/api/v1/company/knowledge")
      .set(auth(owner.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data.about).toBeNull();
  });
});

describe("FAQ", () => {
  it("проходит полный цикл создания, изменения и удаления", async () => {
    const created = await request(context.app)
      .post("/api/v1/company/faq")
      .set(auth(owner.accessToken))
      .send({ question: "Есть ли рассрочка?", answer: "Да, до 6 месяцев", position: 1 });
    expect(created.status).toBe(201);

    const updated = await request(context.app)
      .patch(`/api/v1/company/faq/${created.body.data.id}`)
      .set(auth(owner.accessToken))
      .send({ answer: "Да, до 12 месяцев" });
    expect(updated.body.data.answer).toBe("Да, до 12 месяцев");

    const list = await request(context.app)
      .get("/api/v1/company/faq")
      .set(auth(owner.accessToken));
    expect(list.body.data).toHaveLength(1);

    const removed = await request(context.app)
      .delete(`/api/v1/company/faq/${created.body.data.id}`)
      .set(auth(owner.accessToken));
    expect(removed.status).toBe(204);

    const empty = await request(context.app)
      .get("/api/v1/company/faq")
      .set(auth(owner.accessToken));
    expect(empty.body.data).toHaveLength(0);
  });

  it("отдаёт 404 на несуществующий вопрос", async () => {
    const response = await request(context.app)
      .patch("/api/v1/company/faq/faq_missing")
      .set(auth(owner.accessToken))
      .send({ answer: "Что-то" });

    expect(response.status).toBe(404);
  });

  it("отклоняет слишком короткий вопрос", async () => {
    const response = await request(context.app)
      .post("/api/v1/company/faq")
      .set(auth(owner.accessToken))
      .send({ question: "?", answer: "Ответ" });

    expect(response.status).toBe(400);
  });
});

describe("настройки AI", () => {
  it("отдаёт значения по умолчанию и сохраняет изменения", async () => {
    const defaults = await request(context.app)
      .get("/api/v1/company/ai-settings")
      .set(auth(owner.accessToken));
    expect(defaults.body.data.enabled).toBe(true);

    const updated = await request(context.app)
      .put("/api/v1/company/ai-settings")
      .set(auth(owner.accessToken))
      .send({
        assistantName: "Малика",
        tone: "Тёплый, без навязчивости",
        systemInstructions: "Всегда предлагай бесплатный замер",
        temperature: 0.2,
      });

    expect(updated.body.data.assistantName).toBe("Малика");
    expect(updated.body.data.temperature).toBe(0.2);
  });

  it("отклоняет температуру вне диапазона", async () => {
    const response = await request(context.app)
      .put("/api/v1/company/ai-settings")
      .set(auth(owner.accessToken))
      .send({ temperature: 5 });

    expect(response.status).toBe(400);
  });
});

describe("сотрудники", () => {
  it("создаёт, изменяет и удаляет сотрудника", async () => {
    const created = await request(context.app)
      .post("/api/v1/employees")
      .set(auth(owner.accessToken))
      .send({
        email: "manager@mebelstyle.uz",
        fullName: "Малика Юсупова",
        password: "Manager123!",
        role: "MANAGER",
      });
    expect(created.status).toBe(201);

    const updated = await request(context.app)
      .patch(`/api/v1/employees/${created.body.data.id}`)
      .set(auth(owner.accessToken))
      .send({ fullName: "Малика Ю.", isActive: false });
    expect(updated.body.data.isActive).toBe(false);

    const removed = await request(context.app)
      .delete(`/api/v1/employees/${created.body.data.id}`)
      .set(auth(owner.accessToken));
    expect(removed.status).toBe(204);
  });

  it("не создаёт сотрудника с занятым email", async () => {
    const response = await request(context.app)
      .post("/api/v1/employees")
      .set(auth(owner.accessToken))
      .send({
        email: owner.email,
        fullName: "Дубль",
        password: "Manager123!",
        role: "MANAGER",
      });

    expect(response.status).toBe(409);
  });

  it("отдаёт 404 на несуществующего сотрудника", async () => {
    const response = await request(context.app)
      .patch("/api/v1/employees/usr_missing")
      .set(auth(owner.accessToken))
      .send({ fullName: "Кто-то" });

    expect(response.status).toBe(404);
  });
});

describe("каналы", () => {
  it("переустанавливает webhook по запросу проверки", async () => {
    await connectTelegram(context, owner.accessToken);
    context.telegram.reset();

    const response = await request(context.app)
      .post("/api/v1/channels/telegram/verify")
      .set(auth(owner.accessToken));

    expect(response.status).toBe(200);
    expect(context.telegram.calls.map((call) => call.method)).toContain("setWebhook");
  });

  it("отвечает 404, если канал не подключён", async () => {
    const response = await request(context.app)
      .post("/api/v1/channels/telegram/verify")
      .set(auth(owner.accessToken));

    expect(response.status).toBe(404);
  });

  it("отключает канал и снимает webhook", async () => {
    const channel = await connectTelegram(context, owner.accessToken);

    const response = await request(context.app)
      .delete(`/api/v1/channels/${channel.channelId}`)
      .set(auth(owner.accessToken));

    expect(response.status).toBe(204);
    expect(context.store.channels[0]?.isActive).toBe(false);
    expect(context.telegram.calls.map((call) => call.method)).toContain("deleteWebhook");
  });

  it("не гасит рабочий канал, если переподключение сорвалось", async () => {
    const channel = await connectTelegram(context, owner.accessToken);
    context.telegram.failSetWebhook = true;

    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(owner.accessToken))
      .send({ botToken: channel.botToken });

    expect(response.status).toBe(502);
    // Прежняя рабочая привязка сохранена: клиенты продолжают писать боту.
    const stored = context.store.channels.find((entry) => entry.id === channel.channelId);
    expect(stored?.isActive).toBe(true);
    expect(stored?.botExternalId).toBe("987654321");
  });

  it("открепляет бота: канал выключен, токен стёрт, история цела", async () => {
    const channel = await connectTelegram(context, owner.accessToken);

    const response = await request(context.app)
      .delete(`/api/v1/channels/${channel.channelId}`)
      .set(auth(owner.accessToken));
    expect(response.status).toBe(204);

    const stored = context.store.channels.find((entry) => entry.id === channel.channelId);
    expect(stored?.isActive).toBe(false);
    expect(stored?.botTokenCiphertext).toBe("");
    expect(stored?.botExternalId).toBeNull();
    // Строка канала не удалена — на неё ссылается история диалогов.
    expect(context.store.channels).toHaveLength(1);
    expect(context.telegram.calls.map((call) => call.method)).toContain("deleteWebhook");
  });

  it("после открепления можно подключить нового бота", async () => {
    const channel = await connectTelegram(context, owner.accessToken);
    await request(context.app)
      .delete(`/api/v1/channels/${channel.channelId}`)
      .set(auth(owner.accessToken));

    context.telegram.identity = { id: 555000999, username: "new_shop_bot" };
    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(owner.accessToken))
      .send({ botToken: "987654321:BBFhBOweik6ad9r_ZeuFRFF-NEWtokenABCDEF" });

    expect(response.status).toBe(201);
    expect(response.body.data.botUsername).toBe("new_shop_bot");
    expect(response.body.data.isActive).toBe(true);
    expect(context.store.channels).toHaveLength(1);
  });

  it("verify на откреплённом канале объясняет, что делать", async () => {
    const channel = await connectTelegram(context, owner.accessToken);
    await request(context.app)
      .delete(`/api/v1/channels/${channel.channelId}`)
      .set(auth(owner.accessToken));

    const response = await request(context.app)
      .post("/api/v1/channels/telegram/verify")
      .set(auth(owner.accessToken));

    expect(response.status).toBe(409);
    expect(response.body.error.message).toContain("Подключите нового бота");
  });
  it("гасит канал, если Telegram отклонил webhook", async () => {
    context.telegram.failSetWebhook = true;

    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(owner.accessToken))
      .send({ botToken: "123456789:AAEhBOweik6ad9r_ZeuFRFF-DEMOtokenXYZ" });

    expect(response.status).toBe(502);
    expect(context.store.channels[0]?.isActive).toBe(false);
  });
});