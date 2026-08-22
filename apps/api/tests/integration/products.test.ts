import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { auth, createTestContext, registerCompany, type TestContext } from "../helpers/test-app.js";

let context: TestContext;
let owner: Awaited<ReturnType<typeof registerCompany>>;

const CATALOG_CSV = [
  "external_id,name,description,category,price,currency,stock_status,images,material,color,width_cm,seats",
  'SF-001,"Диван «Милан»","Угловой диван, раскладной",Диваны,7500000,UZS,IN_STOCK,https://cdn.uz/milan.jpg,Рогожка,Серый,280,4',
  "SF-002,Диван Осло,Прямой диван,Диваны,5900000,UZS,IN_STOCK,,Велюр,Бежевый,220,3",
  "SF-003,Диван Прага,Модульный диван,Диваны,9800000,UZS,ON_ORDER,,Кожа,Чёрный,320,5",
  "WD-001,Шкаф-купе Токио,Двухдверный шкаф,Шкафы,4200000,UZS,IN_STOCK,,ЛДСП,Венге,180,",
].join("\n");

beforeEach(async () => {
  context = createTestContext();
  owner = await registerCompany(context.app);
});

async function importCatalog(): Promise<request.Response> {
  return request(context.app)
    .post("/api/v1/products/import")
    .set(auth(owner.accessToken))
    .set("Content-Type", "text/csv")
    .send(CATALOG_CSV);
}

describe("каталог", () => {
  it("создаёт товар", async () => {
    const response = await request(context.app)
      .post("/api/v1/products")
      .set(auth(owner.accessToken))
      .send({
        name: "Диван «Милан»",
        price: 7_500_000,
        category: "Диваны",
        attributes: { material: "Рогожка", color: "Серый" },
      });

    expect(response.status).toBe(201);
    expect(response.body.data.currency).toBe("UZS");
    expect(response.body.data.attributes.material).toBe("Рогожка");
  });

  it("отклоняет отрицательную цену", async () => {
    const response = await request(context.app)
      .post("/api/v1/products")
      .set(auth(owner.accessToken))
      .send({ name: "Диван", price: -1 });

    expect(response.status).toBe(400);
  });

  it("фильтрует по цене — сценарий «диван до 8 млн»", async () => {
    await importCatalog();

    const response = await request(context.app)
      .get("/api/v1/products?q=диван&maxPrice=8000000&sort=price_asc")
      .set(auth(owner.accessToken));

    expect(response.status).toBe(200);
    const names = response.body.data.map((item: { name: string }) => item.name);
    expect(names).toEqual(["Диван Осло", "Диван «Милан»"]);
  });

  it("фильтрует по категории", async () => {
    await importCatalog();
    const response = await request(context.app)
      .get("/api/v1/products?category=Шкафы")
      .set(auth(owner.accessToken));

    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].name).toBe("Шкаф-купе Токио");
  });

  it("отдаёт список категорий", async () => {
    await importCatalog();
    const response = await request(context.app)
      .get("/api/v1/products/categories")
      .set(auth(owner.accessToken));

    expect(response.body.data).toEqual(["Диваны", "Шкафы"]);
  });

  it("пагинирует выдачу", async () => {
    await importCatalog();
    const response = await request(context.app)
      .get("/api/v1/products?page=1&limit=2")
      .set(auth(owner.accessToken));

    expect(response.body.data).toHaveLength(2);
    expect(response.body.meta).toMatchObject({ page: 1, limit: 2, total: 4, totalPages: 2 });
  });

  it("удаление делает товар неактивным, не стирая его", async () => {
    const created = await request(context.app)
      .post("/api/v1/products")
      .set(auth(owner.accessToken))
      .send({ name: "Диван", price: 1_000_000 });

    const deleted = await request(context.app)
      .delete(`/api/v1/products/${created.body.data.id}`)
      .set(auth(owner.accessToken));

    expect(deleted.status).toBe(204);
    expect(context.store.products[0]?.active).toBe(false);
  });

  it("отклоняет minPrice больше maxPrice", async () => {
    const response = await request(context.app)
      .get("/api/v1/products?minPrice=900&maxPrice=100")
      .set(auth(owner.accessToken));

    expect(response.status).toBe(400);
  });
});

describe("импорт CSV", () => {
  it("загружает каталог из сырого text/csv", async () => {
    const response = await importCatalog();

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({ received: 4, imported: 4, updated: 0, failed: 0 });
    expect(context.store.products).toHaveLength(4);
  });

  it("принимает JSON-обёртку {csv}", async () => {
    const response = await request(context.app)
      .post("/api/v1/products/import")
      .set(auth(owner.accessToken))
      .send({ csv: "name,price\nСтол,1200000" });

    expect(response.status).toBe(200);
    expect(response.body.data.imported).toBe(1);
  });

  it("повторный импорт обновляет, а не дублирует", async () => {
    await importCatalog();
    const updatedCsv = CATALOG_CSV.replace("7500000", "6900000");

    const response = await request(context.app)
      .post("/api/v1/products/import")
      .set(auth(owner.accessToken))
      .set("Content-Type", "text/csv")
      .send(updatedCsv);

    expect(response.body.data).toMatchObject({ imported: 0, updated: 4 });
    expect(context.store.products).toHaveLength(4);
    const milan = context.store.products.find((product) => product.externalId === "SF-001");
    expect(milan?.price).toBe(6_900_000);
  });

  it("сообщает о битых строках и импортирует остальные", async () => {
    const response = await request(context.app)
      .post("/api/v1/products/import")
      .set(auth(owner.accessToken))
      .set("Content-Type", "text/csv")
      .send("name,price\nДиван,7500000\nБезЦены,\n,1000000");

    expect(response.body.data.imported).toBe(1);
    expect(response.body.data.errors).toHaveLength(2);
  });

  it("отклоняет пустое тело", async () => {
    const response = await request(context.app)
      .post("/api/v1/products/import")
      .set(auth(owner.accessToken))
      .send({});

    expect(response.status).toBe(400);
  });
});

describe("роли", () => {
  it("менеджер читает каталог, но не меняет его", async () => {
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

    const login = await request(context.app)
      .post("/api/v1/auth/login")
      .send({ email: "manager@mebelstyle.uz", password: "Manager123!" });
    const managerToken = login.body.data.tokens.accessToken;

    const read = await request(context.app).get("/api/v1/products").set(auth(managerToken));
    expect(read.status).toBe(200);

    const write = await request(context.app)
      .post("/api/v1/products")
      .set(auth(managerToken))
      .send({ name: "Диван", price: 1_000_000 });
    expect(write.status).toBe(403);
    expect(write.body.error.code).toBe("FORBIDDEN");
  });

  it("нельзя понизить последнего владельца", async () => {
    const response = await request(context.app)
      .patch(`/api/v1/employees/${owner.userId}`)
      .set(auth(owner.accessToken))
      .send({ role: "MANAGER" });

    expect(response.status).toBe(403);
  });

  it("нельзя удалить самого себя", async () => {
    const response = await request(context.app)
      .delete(`/api/v1/employees/${owner.userId}`)
      .set(auth(owner.accessToken));

    expect(response.status).toBe(403);
  });
});