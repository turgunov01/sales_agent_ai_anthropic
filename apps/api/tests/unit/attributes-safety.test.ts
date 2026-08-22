import { describe, expect, it } from "vitest";
import { isSafeAttributeKey, toProductAttributes } from "../../src/infra/prisma/mappers.js";
import { csvToProducts, parseCsv } from "../../src/modules/products/csv.js";
import { attributesSchema, createProductSchema } from "../../src/modules/products/products.schema.js";
import { searchProductsArgs } from "../../src/modules/ai/tools/definitions.js";

/**
 * Атрибуты товара приходят из CSV магазина, из JSON админки и из аргументов
 * модели. Ключ вида __proto__ при наивном присваивании меняет прототип объекта,
 * а не создаёт поле. Проверяем все три входа.
 */
describe("защита атрибутов товара от загрязнения прототипа", () => {
  it("определяет опасные ключи", () => {
    expect(isSafeAttributeKey("color")).toBe(true);
    expect(isSafeAttributeKey("__proto__")).toBe(false);
    expect(isSafeAttributeKey("constructor")).toBe(false);
    expect(isSafeAttributeKey("prototype")).toBe(false);
    expect(isSafeAttributeKey("")).toBe(false);
  });

  it("не переносит опасные ключи из БД в объект", () => {
    const attributes = toProductAttributes(JSON.parse('{"color":"Серый","__proto__":{"polluted":true}}'));

    expect(attributes.color).toBe("Серый");
    expect(Object.keys(attributes)).toEqual(["color"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("не даёт CSV изменить прототип", () => {
    const { products } = csvToProducts(parseCsv("name,price,__proto__,color\nДиван,100,polluted,Серый"));

    expect(products[0]?.attributes.color).toBe("Серый");
    expect(Object.keys(products[0]?.attributes ?? {})).toEqual(["color"]);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it("схема товара отклоняет опасный ключ", () => {
    expect(attributesSchema.safeParse({ color: "Серый" }).success).toBe(true);
    expect(attributesSchema.safeParse(JSON.parse('{"constructor":"x"}')).success).toBe(false);

    const product = createProductSchema.safeParse({
      name: "Диван",
      price: 100,
      attributes: JSON.parse('{"prototype":"x"}'),
    });
    expect(product.success).toBe(false);
  });

  it("аргументы инструмента модели тоже проверяются", () => {
    expect(searchProductsArgs.safeParse({ attributes: { color: "Серый" } }).success).toBe(true);
    expect(
      searchProductsArgs.safeParse({ attributes: JSON.parse('{"constructor":"x"}') }).success,
    ).toBe(false);
  });
});