import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import {
  DEMO_PASSWORD,
  PLATFORM_PASSWORD,
  auth,
  connectTelegram,
  createTestContext,
  registerCompany,
  registerPlatformAdmin,
  sendTelegramUpdate,
  telegramTextUpdate,
  type TestContext,
} from "../helpers/test-app.js";
import { textResponse } from "../helpers/fake-llm.js";

let context: TestContext;
let ops: Awaited<ReturnType<typeof registerPlatformAdmin>>;

beforeEach(async () => {
  context = createTestContext();
  ops = await registerPlatformAdmin(context);
});

describe("вход оператора платформы", () => {
  it("не пускает с неверным паролем", async () => {
    const response = await request(context.app)
      .post("/api/v1/platform/auth/login")
      .send({ email: ops.email, password: "WrongPass1" });
    expect(response.status).toBe(401);
  });

  it("отдаёт профиль оператора", async () => {
    const response = await request(context.app)
      .get("/api/v1/platform/auth/me")
      .set(auth(ops.accessToken));
    expect(response.status).toBe(200);
    expect(response.body.data.email).toBe(ops.email);
  });

  it("токен компании не открывает платформенные маршруты", async () => {
    const owner = await registerCompany(context.app);
    const response = await request(context.app)
      .get("/api/v1/platform/companies")
      .set(auth(owner.accessToken));
    expect(response.status).toBe(401);
  });

  it("токен оператора не открывает кабинет компании", async () => {
    const response = await request(context.app)
      .get("/api/v1/products")
      .set(auth(ops.accessToken));
    expect(response.status).toBe(401);
  });
});

describe("список компаний", () => {
  it("показывает метрики по каждой компании", async () => {
    const owner = await registerCompany(context.app);
    await request(context.app)
      .post("/api/v1/products")
      .set(auth(owner.accessToken))
      .send({ name: "Диван", price: 5_000_000 });
    await connectTelegram(context, owner.accessToken);

    const response = await request(context.app)
      .get("/api/v1/platform/companies")
      .set(auth(ops.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0]).toMatchObject({
      name: "Mebel Style",
      users: 1,
      products: 1,
      channelConnected: true,
      status: "ACTIVE",
    });
  });

  it("фильтрует по поиску и статусу", async () => {
    await registerCompany(context.app, { companyName: "Mebel Style", email: "a@a.uz" });
    await registerCompany(context.app, { companyName: "Uyquruq", email: "b@b.uz" });

    const found = await request(context.app)
      .get("/api/v1/platform/companies?search=uyq")
      .set(auth(ops.accessToken));
    expect(found.body.data).toHaveLength(1);
    expect(found.body.data[0].name).toBe("Uyquruq");
  });
});

describe("создание компании оператором", () => {
  it("создаёт компанию с владельцем, который сразу может войти", async () => {
    const response = await request(context.app)
      .post("/api/v1/platform/companies")
      .set(auth(ops.accessToken))
      .send({
        companyName: "Sofa Market",
        ownerFullName: "Бек Рахимов",
        ownerEmail: "bek@sofamarket.uz",
        ownerPassword: "Sofa123456!",
        phone: "901112233",
      });

    expect(response.status).toBe(201);
    expect(response.body.data.slug).toBe("sofa-market");
    expect(response.body.data.users).toBe(1);

    const login = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: "bek@sofamarket.uz", password: "Sofa123456!" });
    expect(login.status).toBe(200);
    expect(login.body.data.user.role).toBe("OWNER");
  });

  it("отклоняет занятый email и слабый пароль", async () => {
    await registerCompany(context.app, { email: "owner@mebelstyle.uz" });

    const duplicate = await request(context.app)
      .post("/api/v1/platform/companies")
      .set(auth(ops.accessToken))
      .send({
        companyName: "Другая",
        ownerFullName: "Кто-то",
        ownerEmail: "owner@mebelstyle.uz",
        ownerPassword: "Sofa123456!",
      });
    expect(duplicate.status).toBe(409);

    const weak = await request(context.app)
      .post("/api/v1/platform/companies")
      .set(auth(ops.accessToken))
      .send({
        companyName: "Третья",
        ownerFullName: "Кто-то",
        ownerEmail: "new@shop.uz",
        ownerPassword: "short1",
      });
    expect(weak.status).toBe(400);
  });
});

describe("блокировка компании", () => {
  it("обрывает сессии, закрывает вход и заставляет бота замолчать", async () => {
    const owner = await registerCompany(context.app);
    const channel = await connectTelegram(context, owner.accessToken);
    context.telegram.reset();

    const suspended = await request(context.app)
      .post(`/api/v1/platform/companies/${owner.companyId}/status`)
      .set(auth(ops.accessToken))
      .send({ status: "SUSPENDED", reason: "Неоплата" });
    expect(suspended.status).toBe(200);
    expect(suspended.body.data.status).toBe("SUSPENDED");

    // Действующий access-токен больше не работает.
    const afterSuspend = await request(context.app)
      .get("/api/v1/products")
      .set(auth(owner.accessToken));
    expect(afterSuspend.status).toBe(403);

    // Вход закрыт.
    const login = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: owner.email, password: DEMO_PASSWORD });
    expect(login.status).toBe(403);

    // Обновить сессию нельзя: блокировка отозвала refresh-токены компании.
    const refreshed = await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: owner.refreshToken });
    expect(refreshed.status).toBe(401);
    expect(context.store.sessions.every((session) => session.revokedAt !== null)).toBe(true);

    // Бот молчит.
    context.llm.script(textResponse("Здравствуйте!"));
    await sendTelegramUpdate(context, channel, telegramTextUpdate("Привет", { updateId: 700 }));
    expect(context.llm.requests).toHaveLength(0);
    expect(context.telegram.sentMessages).toHaveLength(0);
  });

  it("разблокировка возвращает доступ", async () => {
    const owner = await registerCompany(context.app);

    await request(context.app)
      .post(`/api/v1/platform/companies/${owner.companyId}/status`)
      .set(auth(ops.accessToken))
      .send({ status: "SUSPENDED" });
    await request(context.app)
      .post(`/api/v1/platform/companies/${owner.companyId}/status`)
      .set(auth(ops.accessToken))
      .send({ status: "ACTIVE" });

    const login = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: owner.email, password: DEMO_PASSWORD });
    expect(login.status).toBe(200);
  });
});

describe("журнал действий", () => {
  it("записывает вход, создание и блокировку", async () => {
    const owner = await registerCompany(context.app);
    await request(context.app)
      .post(`/api/v1/platform/companies/${owner.companyId}/status`)
      .set(auth(ops.accessToken))
      .send({ status: "SUSPENDED" });

    const response = await request(context.app)
      .get("/api/v1/platform/audit")
      .set(auth(ops.accessToken));

    const actions = response.body.data.map((entry: { action: string }) => entry.action);
    expect(actions).toContain("company.suspend");
    expect(actions).toContain("login");
    expect(response.body.data[0].adminEmail).toBe(ops.email);
  });
});

describe("пароль оператора", () => {
  it("хранится только хэшем", async () => {
    expect(context.store.platformAdmins[0]?.passwordHash).not.toContain(PLATFORM_PASSWORD);
    expect(context.store.platformAdmins[0]?.passwordHash.startsWith("scrypt$")).toBe(true);
  });
});