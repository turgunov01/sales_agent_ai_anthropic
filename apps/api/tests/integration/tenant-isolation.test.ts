import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { ChannelType, Language } from "@ai-sales/shared";
import {
  auth,
  connectTelegram,
  createTestContext,
  registerCompany,
  type TestContext,
} from "../helpers/test-app.js";

let context: TestContext;
let alpha: Awaited<ReturnType<typeof registerCompany>>;
let beta: Awaited<ReturnType<typeof registerCompany>>;

beforeEach(async () => {
  context = createTestContext();
  alpha = await registerCompany(context.app, {
    companyName: "Mebel Style",
    email: "owner@mebelstyle.uz",
  });
  beta = await registerCompany(context.app, {
    companyName: "Uyquruq Mebel",
    email: "owner@uyquruq.uz",
  });
});

async function createProduct(token: string, name: string): Promise<string> {
  const response = await request(context.app)
    .post("/api/v1/products")
    .set(auth(token))
    .send({ name, price: 7_500_000, category: "Диваны" });
  expect(response.status).toBe(201);
  return response.body.data.id;
}

describe("изоляция арендаторов", () => {
  it("каталог одной компании не виден другой", async () => {
    await createProduct(alpha.accessToken, "Диван «Милан»");

    const alphaList = await request(context.app)
      .get("/api/v1/products")
      .set(auth(alpha.accessToken));
    const betaList = await request(context.app).get("/api/v1/products").set(auth(beta.accessToken));

    expect(alphaList.body.data).toHaveLength(1);
    expect(betaList.body.data).toHaveLength(0);
  });

  it("чужой товар отдаёт 404, а не 403", async () => {
    const productId = await createProduct(alpha.accessToken, "Диван «Милан»");

    const response = await request(context.app)
      .get(`/api/v1/products/${productId}`)
      .set(auth(beta.accessToken));

    expect(response.status).toBe(404);
  });

  it("чужой товар нельзя изменить или удалить", async () => {
    const productId = await createProduct(alpha.accessToken, "Диван «Милан»");

    const patched = await request(context.app)
      .patch(`/api/v1/products/${productId}`)
      .set(auth(beta.accessToken))
      .send({ price: 1 });
    const deleted = await request(context.app)
      .delete(`/api/v1/products/${productId}`)
      .set(auth(beta.accessToken));

    expect(patched.status).toBe(404);
    expect(deleted.status).toBe(404);

    const original = context.store.products.find((entry) => entry.id === productId);
    expect(original?.price).toBe(7_500_000);
    expect(original?.active).toBe(true);
  });

  it("сотрудники одной компании не видны другой", async () => {
    const alphaEmployees = await request(context.app)
      .get("/api/v1/employees")
      .set(auth(alpha.accessToken));
    const betaEmployees = await request(context.app)
      .get("/api/v1/employees")
      .set(auth(beta.accessToken));

    expect(alphaEmployees.body.data).toHaveLength(1);
    expect(betaEmployees.body.data).toHaveLength(1);
    expect(alphaEmployees.body.data[0].id).not.toBe(betaEmployees.body.data[0].id);
  });

  it("чужого сотрудника нельзя изменить", async () => {
    const response = await request(context.app)
      .patch(`/api/v1/employees/${alpha.userId}`)
      .set(auth(beta.accessToken))
      .send({ fullName: "Взломано" });

    expect(response.status).toBe(404);
    const user = context.store.users.find((entry) => entry.id === alpha.userId);
    expect(user?.fullName).toBe("Азиз Каримов");
  });

  it("лиды и диалоги разделены между компаниями", async () => {
    const at = context.store.now();
    context.store.customers.push({
      id: "cus_alpha",
      companyId: alpha.companyId,
      channelType: ChannelType.TELEGRAM,
      externalId: "1001",
      firstName: "Дилшод",
      lastName: null,
      username: null,
      phone: "+998901234567",
      language: Language.RU,
      createdAt: at,
      updatedAt: at,
    });

    const created = await request(context.app)
      .post("/api/v1/leads")
      .set(auth(alpha.accessToken))
      .send({ customerId: "cus_alpha", interest: "Угловой диван" });
    expect(created.status).toBe(201);

    const betaLeads = await request(context.app).get("/api/v1/leads").set(auth(beta.accessToken));
    expect(betaLeads.body.data).toHaveLength(0);

    const betaLead = await request(context.app)
      .get(`/api/v1/leads/${created.body.data.id}`)
      .set(auth(beta.accessToken));
    expect(betaLead.status).toBe(404);
  });

  it("нельзя привязать лид к чужому клиенту", async () => {
    const at = context.store.now();
    context.store.customers.push({
      id: "cus_alpha_2",
      companyId: alpha.companyId,
      channelType: ChannelType.TELEGRAM,
      externalId: "1002",
      firstName: "Дилшод",
      lastName: null,
      username: null,
      phone: null,
      language: Language.RU,
      createdAt: at,
      updatedAt: at,
    });

    const response = await request(context.app)
      .post("/api/v1/leads")
      .set(auth(beta.accessToken))
      .send({ customerId: "cus_alpha_2", interest: "Диван" });

    expect(response.status).toBe(404);
  });

  it("аналитика считает только свои данные", async () => {
    await createProduct(alpha.accessToken, "Диван «Милан»");

    const alphaStats = await request(context.app)
      .get("/api/v1/analytics/overview?days=7")
      .set(auth(alpha.accessToken));
    const betaStats = await request(context.app)
      .get("/api/v1/analytics/overview?days=7")
      .set(auth(beta.accessToken));

    expect(alphaStats.body.data.products.total).toBe(1);
    expect(betaStats.body.data.products.total).toBe(0);
  });
});

describe("захват чужого Telegram-бота", () => {
  it("вторая компания не может подключить бота, уже занятого первой", async () => {
    const channel = await connectTelegram(context, alpha.accessToken);
    context.telegram.reset();

    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(beta.accessToken))
      .send({ botToken: channel.botToken });

    expect(response.status).toBe(409);

    // Канал первой компании остался рабочим...
    const alphaChannel = context.store.channels.find(
      (entry) => entry.companyId === alpha.companyId,
    );
    expect(alphaChannel?.isActive).toBe(true);
    expect(alphaChannel?.id).toBe(channel.channelId);

    // ...и вебхук на вторую компанию не переставлялся.
    expect(context.telegram.calls.filter((call) => call.method === "setWebhook")).toHaveLength(0);
    expect(context.store.channels.filter((entry) => entry.isActive)).toHaveLength(1);
  });

  it("после отключения бот освобождается для другой компании", async () => {
    const channel = await connectTelegram(context, alpha.accessToken);

    await request(context.app)
      .delete(`/api/v1/channels/${channel.channelId}`)
      .set(auth(alpha.accessToken));

    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(beta.accessToken))
      .send({ botToken: channel.botToken });

    expect(response.status).toBe(201);
  });

  it("та же компания может переподключить своего бота", async () => {
    const channel = await connectTelegram(context, alpha.accessToken);

    const response = await request(context.app)
      .post("/api/v1/channels/telegram")
      .set(auth(alpha.accessToken))
      .send({ botToken: channel.botToken });

    expect(response.status).toBe(201);
    expect(context.store.channels.filter((entry) => entry.companyId === alpha.companyId)).toHaveLength(1);
  });
});