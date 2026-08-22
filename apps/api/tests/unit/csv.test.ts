import { describe, expect, it } from "vitest";
import { Currency, StockStatus } from "@ai-sales/shared";
import { csvToProducts, parseCsv } from "../../src/modules/products/csv.js";

const CATALOG = [
  "external_id,name,description,category,price,currency,stock_status,images,material,color,width_cm,seats",
  'SF-001,"Диван «Милан»","Угловой диван, раскладной",Диваны,7500000,UZS,IN_STOCK,https://cdn.uz/1.jpg|https://cdn.uz/2.jpg,Рогожка,Серый,280,4',
  "SF-002,Диван Осло,Прямой диван,Диваны,5900000,UZS,ON_ORDER,,Велюр,Бежевый,220,3",
].join("\n");

describe("parseCsv", () => {
  it("разбирает заголовок и строки", () => {
    const table = parseCsv(CATALOG);
    expect(table.headers[0]).toBe("external_id");
    expect(table.rows).toHaveLength(2);
  });

  it("сохраняет запятые внутри кавычек", () => {
    const table = parseCsv(CATALOG);
    expect(table.rows[0]?.[2]).toBe("Угловой диван, раскладной");
  });

  it("понимает точку с запятой как разделитель", () => {
    const table = parseCsv("name;price\nСтол;1200000");
    expect(table.headers).toEqual(["name", "price"]);
    expect(table.rows[0]).toEqual(["Стол", "1200000"]);
  });

  it("срезает BOM и пустые строки", () => {
    const table = parseCsv("\uFEFFname,price\nСтол,1000\n\n");
    expect(table.headers[0]).toBe("name");
    expect(table.rows).toHaveLength(1);
  });
});

describe("csvToProducts", () => {
  it("превращает строки в товары", () => {
    const { products, errors } = csvToProducts(parseCsv(CATALOG));
    expect(errors).toHaveLength(0);
    expect(products).toHaveLength(2);

    const first = products[0];
    expect(first?.externalId).toBe("SF-001");
    expect(first?.name).toBe("Диван «Милан»");
    expect(first?.price).toBe(7_500_000);
    expect(first?.currency).toBe(Currency.UZS);
    expect(first?.images).toHaveLength(2);
    expect(first?.stockStatus).toBe(StockStatus.IN_STOCK);
  });

  it("складывает неизвестные колонки в атрибуты", () => {
    const { products } = csvToProducts(parseCsv(CATALOG));
    expect(products[0]?.attributes).toMatchObject({
      material: "Рогожка",
      color: "Серый",
      width_cm: 280,
      seats: 4,
    });
  });

  it("понимает цену с пробелами и словом «млн»", () => {
    const { products } = csvToProducts(parseCsv("name,price\nДиван,7 500 000\nШкаф,12 млн"));
    expect(products[0]?.price).toBe(7_500_000);
    expect(products[1]?.price).toBe(12_000_000);
  });

  it("сообщает о битых строках, не теряя остальные", () => {
    const { products, errors } = csvToProducts(
      parseCsv("name,price\nДиван,7500000\n,5000000\nШкаф,цена-по-запросу"),
    );
    expect(products).toHaveLength(1);
    expect(errors).toHaveLength(2);
    expect(errors[0]?.line).toBe(3);
    expect(errors[1]?.message).toContain("Некорректная цена");
  });

  it("требует колонку name", () => {
    const { products, errors } = csvToProducts(parseCsv("sku,price\nSF-1,100"));
    expect(products).toHaveLength(0);
    expect(errors[0]?.message).toContain("name");
  });

  it("отбрасывает ссылки на изображения без http", () => {
    const { products } = csvToProducts(parseCsv("name,price,images\nДиван,100,not-a-url|https://cdn.uz/a.jpg"));
    expect(products[0]?.images).toEqual(["https://cdn.uz/a.jpg"]);
  });
});