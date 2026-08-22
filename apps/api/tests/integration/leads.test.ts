import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { ChannelType, Language } from "@ai-sales/shared";
import { auth, createTestContext, registerCompany, type TestContext } from "../helpers/test-app.js";

let context: TestContext;
let owner: Awaited<ReturnType<typeof registerCompany>>;
const CUSTOMER_ID = "cus_test_1";

beforeEach(async () => {
  context = createTestContext();
  owner = await registerCompany(context.app);

  const at = context.store.now();
  context.store.customers.push({
    id: CUSTOMER_ID,
    companyId: owner.companyId,
    channelType: ChannelType.TELEGRAM,
    externalId: "555000111",
    firstName: "Дилшод",
    lastName: null,
    username: "dilshod",
    phone: null,
    language: Language.RU,
    createdAt: at,
    updatedAt: at,
  });
});

async function createLead(payload: Record<string, unknown> = {}): Promise<request.Response> {
  return request(context.app)
    .post("/api/v1/leads")
    .set(auth(owner.accessToken))
    .send({ customerId: CUSTOMER_ID, interest: "Угловой диван до 8 млн", ...payload });
}

describe("создание лида", () => {
  it("создаёт лид и пишет событие", async () => {
    const response = await createLead();

    expect(response.status).toBe(201);
    expect(response.body.data.status).toBe("NEW");
    expect(response.body.data.qualificationScore).toBe(20);

    const events = context.store.leadEvents.filter(
      (event) => event.leadId === response.body.data.id,
    );
    expect(events[0]?.type).toBe("CREATED");
  });

  it("квалифицирует лид при наличии телефона и интереса", async () => {
    const response = await createLead({ phone: "901234567", name: "Дилшод" });

    expect(response.body.data.status).toBe("QUALIFIED");
    expect(response.body.data.phone).toBe("+998901234567");
    expect(response.body.data.qualificationScore).toBe(70);
  });

  it("отклоняет некорректный телефон", async () => {
    const response = await createLead({ phone: "12345" });
    expect(response.status).toBe(400);
  });

  it("не создаёт лид для несуществующего клиента", async () => {
    const response = await request(context.app)
      .post("/api/v1/leads")
      .set(auth(owner.accessToken))
      .send({ customerId: "cus_missing", interest: "Диван" });

    expect(response.status).toBe(404);
  });
});

describe("обновление лида", () => {
  it("пересчитывает статус, когда появился телефон", async () => {
    const created = await createLead();
    expect(created.body.data.status).toBe("NEW");

    const updated = await request(context.app)
      .patch(`/api/v1/leads/${created.body.data.id}`)
      .set(auth(owner.accessToken))
      .send({ phone: "+998901234567" });

    expect(updated.body.data.status).toBe("QUALIFIED");

    const events = context.store.leadEvents.filter(
      (event) => event.leadId === created.body.data.id,
    );
    expect(events.some((event) => event.type === "CONTACT_CAPTURED")).toBe(true);
  });

  it("сохраняет бюджет и товары интереса", async () => {
    const created = await createLead();
    const updated = await request(context.app)
      .patch(`/api/v1/leads/${created.body.data.id}`)
      .set(auth(owner.accessToken))
      .send({ budgetMax: 8_000_000, interestedProductIds: ["prd_1", "prd_2"] });

    expect(updated.body.data.budgetMax).toBe(8_000_000);
    expect(updated.body.data.interestedProductIds).toHaveLength(2);
  });
});

describe("статусы лида", () => {
  it("проводит лид по воронке до WON", async () => {
    const created = await createLead({ phone: "+998901234567" });
    const leadId = created.body.data.id;

    const contacted = await request(context.app)
      .post(`/api/v1/leads/${leadId}/status`)
      .set(auth(owner.accessToken))
      .send({ status: "CONTACTED", comment: "Позвонили, договорились о замере" });
    expect(contacted.body.data.status).toBe("CONTACTED");
    expect(contacted.body.data.contactedAt).not.toBeNull();

    const won = await request(context.app)
      .post(`/api/v1/leads/${leadId}/status`)
      .set(auth(owner.accessToken))
      .send({ status: "WON" });
    expect(won.body.data.status).toBe("WON");
    expect(won.body.data.closedAt).not.toBeNull();
  });

  it("запрещает недопустимый переход", async () => {
    const created = await createLead();
    const leadId = created.body.data.id;

    const jump = await request(context.app)
      .post(`/api/v1/leads/${leadId}/status`)
      .set(auth(owner.accessToken))
      .send({ status: "WON" });

    expect(jump.status).toBe(409);
    expect(jump.body.error.message).toContain("недопустим");
  });

  it("запрещает выход из терминального статуса", async () => {
    const created = await createLead();
    const leadId = created.body.data.id;

    await request(context.app)
      .post(`/api/v1/leads/${leadId}/status`)
      .set(auth(owner.accessToken))
      .send({ status: "LOST" });

    const revive = await request(context.app)
      .post(`/api/v1/leads/${leadId}/status`)
      .set(auth(owner.accessToken))
      .send({ status: "NEW" });

    expect(revive.status).toBe(409);
  });
});

describe("назначение менеджера", () => {
  it("назначает и снимает менеджера", async () => {
    const created = await createLead();
    const leadId = created.body.data.id;

    const assigned = await request(context.app)
      .post(`/api/v1/leads/${leadId}/assign`)
      .set(auth(owner.accessToken))
      .send({ managerId: owner.userId });
    expect(assigned.body.data.assignedManagerId).toBe(owner.userId);

    const released = await request(context.app)
      .post(`/api/v1/leads/${leadId}/assign`)
      .set(auth(owner.accessToken))
      .send({ managerId: null });
    expect(released.body.data.assignedManagerId).toBeNull();
  });

  it("не назначает несуществующего менеджера", async () => {
    const created = await createLead();
    const response = await request(context.app)
      .post(`/api/v1/leads/${created.body.data.id}/assign`)
      .set(auth(owner.accessToken))
      .send({ managerId: "usr_missing" });

    expect(response.status).toBe(404);
  });
});

describe("список и карточка лида", () => {
  it("фильтрует по статусу и поиску", async () => {
    await createLead({ phone: "+998901234567", name: "Дилшод" });
    await createLead({ interest: "Кухонный стол" });

    const qualified = await request(context.app)
      .get("/api/v1/leads?status=QUALIFIED")
      .set(auth(owner.accessToken));
    expect(qualified.body.data).toHaveLength(1);

    const search = await request(context.app)
      .get("/api/v1/leads?q=стол")
      .set(auth(owner.accessToken));
    expect(search.body.data).toHaveLength(1);
    expect(search.body.data[0].interest).toBe("Кухонный стол");
  });

  it("карточка содержит историю событий и клиента", async () => {
    const created = await createLead();
    const response = await request(context.app)
      .get(`/api/v1/leads/${created.body.data.id}`)
      .set(auth(owner.accessToken));

    expect(response.body.data.events).toHaveLength(1);
    expect(response.body.data.customer.externalId).toBe("555000111");
  });
});