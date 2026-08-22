import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { DEMO_PASSWORD, auth, createTestContext, registerCompany, type TestContext } from "../helpers/test-app.js";

let context: TestContext;

beforeEach(() => {
  context = createTestContext();
});

describe("POST /api/v1/auth/register", () => {
  it("создаёт компанию, владельца и выдаёт токены", async () => {
    const response = await request(context.app).post("/api/v1/auth/register").send({
      companyName: "Mebel Style",
      fullName: "Азиз Каримов",
      email: "owner@mebelstyle.uz",
      password: DEMO_PASSWORD,
      phone: "+998901234567",
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.company.slug).toBe("mebel-style");
    expect(response.body.data.user.role).toBe("OWNER");
    expect(response.body.data.tokens.accessToken).toBeTruthy();
    expect(response.body.data.user).not.toHaveProperty("passwordHash");
  });

  it("создаёт базу знаний и настройки AI вместе с компанией", async () => {
    await registerCompany(context.app);
    expect(context.store.knowledge).toHaveLength(1);
    expect(context.store.aiSettings).toHaveLength(1);
  });

  it("не допускает второй регистрации на тот же email", async () => {
    await registerCompany(context.app);
    const response = await request(context.app).post("/api/v1/auth/register").send({
      companyName: "Другая компания",
      fullName: "Другой владелец",
      email: "owner@mebelstyle.uz",
      password: DEMO_PASSWORD,
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CONFLICT");
  });

  it("делает slug уникальным при совпадении названий", async () => {
    await registerCompany(context.app);
    const second = await registerCompany(context.app, { email: "second@mebelstyle.uz" });
    const company = context.store.companies.find((entry) => entry.id === second.companyId);
    expect(company?.slug).toBe("mebel-style-2");
  });

  it("отклоняет слабый пароль с деталями ошибки", async () => {
    const response = await request(context.app).post("/api/v1/auth/register").send({
      companyName: "Mebel Style",
      fullName: "Азиз Каримов",
      email: "owner@mebelstyle.uz",
      password: "12345678",
    });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("VALIDATION_ERROR");
    expect(response.body.error.details[0].path).toBe("password");
  });

  it("не хранит пароль в открытом виде", async () => {
    await registerCompany(context.app);
    const user = context.store.users[0];
    expect(user?.passwordHash).not.toContain(DEMO_PASSWORD);
    expect(user?.passwordHash.startsWith("scrypt$")).toBe(true);
  });
});

describe("POST /api/v1/auth/login", () => {
  beforeEach(async () => {
    await registerCompany(context.app);
  });

  it("пускает с верным паролем", async () => {
    const response = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: "owner@mebelstyle.uz", password: DEMO_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.data.tokens.refreshToken).toBeTruthy();
  });

  it("одинаково отвечает на неверный пароль и неизвестный email", async () => {
    const wrongPassword = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: "owner@mebelstyle.uz", password: "WrongPass1" });
    const unknownEmail = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.uz", password: DEMO_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
  });

  it("не пускает отключённого сотрудника", async () => {
    const user = context.store.users[0];
    if (user) user.isActive = false;

    const response = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: "owner@mebelstyle.uz", password: DEMO_PASSWORD });

    expect(response.status).toBe(403);
  });
});

describe("refresh и logout", () => {
  it("ротирует refresh-токен и запрещает повторное использование", async () => {
    const registered = await registerCompany(context.app);

    const first = await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: registered.refreshToken });
    expect(first.status).toBe(200);
    expect(first.body.data.refreshToken).not.toBe(registered.refreshToken);

    const replay = await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: registered.refreshToken });
    expect(replay.status).toBe(401);
  });

  it("после повторного использования гасит все сессии пользователя", async () => {
    const registered = await registerCompany(context.app);
    const rotated = await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: registered.refreshToken });

    await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: registered.refreshToken });

    const afterReuse = await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: rotated.body.data.refreshToken });
    expect(afterReuse.status).toBe(401);
  });

  it("logout завершает сессию", async () => {
    const registered = await registerCompany(context.app);
    const loggedOut = await request(context.app)
      .post("/api/v1/auth/logout")
      .send({ refreshToken: registered.refreshToken });
    expect(loggedOut.status).toBe(200);

    const afterLogout = await request(context.app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: registered.refreshToken });
    expect(afterLogout.status).toBe(401);
  });
});

describe("защита маршрутов", () => {
  it("требует токен", async () => {
    const response = await request(context.app).get("/api/v1/products");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("отклоняет мусорный токен", async () => {
    const response = await request(context.app).get("/api/v1/products").set(auth("not.a.valid.token"));
    expect(response.status).toBe(401);
  });

  it("возвращает профиль по /auth/me", async () => {
    const registered = await registerCompany(context.app);
    const response = await request(context.app)
      .get("/api/v1/auth/me")
      .set(auth(registered.accessToken));

    expect(response.status).toBe(200);
    expect(response.body.data.user.email).toBe("owner@mebelstyle.uz");
    expect(response.body.data.company.name).toBe("Mebel Style");
  });

  it("добавляет requestId в ответ об ошибке", async () => {
    const response = await request(context.app).get("/api/v1/products");
    expect(response.body.requestId).toBeTruthy();
    expect(response.headers["x-request-id"]).toBeTruthy();
  });

  it("возвращает 404 на неизвестный маршрут", async () => {
    const response = await request(context.app).get("/api/v1/unknown");
    expect(response.status).toBe(404);
  });
});

describe("GET /health", () => {
  it("отвечает без авторизации", async () => {
    const response = await request(context.app).get("/health");
    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  it("сообщает готовность базы", async () => {
    const response = await request(context.app).get("/health/ready");
    expect(response.status).toBe(200);
    expect(response.body.data.database).toBe(true);
  });
});