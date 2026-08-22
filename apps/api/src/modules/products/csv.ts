import { Currency, StockStatus } from "@ai-sales/shared";
import { parseAmount } from "../../core/utils/amount.js";
import { isSafeAttributeKey } from "../../infra/prisma/mappers.js";
import type { ProductAttributes } from "../../domain/entities.js";
import type { ProductWriteInput } from "../../domain/repositories.js";

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export interface ImportRowError {
  line: number;
  message: string;
}

export interface ParsedImport {
  products: ProductWriteInput[];
  errors: ImportRowError[];
}

/** Разбор CSV с поддержкой кавычек, переводов строк внутри полей и ; как разделителя. */
export function parseCsv(text: string): CsvTable {
  const content = text.replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const delimiter = detectDelimiter(content);

  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < content.length; index += 1) {
    const char = content[index];

    if (inQuotes) {
      if (char === '"') {
        if (content[index + 1] === '"') {
          field += '"';
          index += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field.trim());
      field = "";
    } else if (char === "\n") {
      row.push(field.trim());
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char ?? "";
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field.trim());
    rows.push(row);
  }

  const nonEmpty = rows.filter((entry) => entry.some((cell) => cell.length > 0));
  const headers = (nonEmpty.shift() ?? []).map((header) => header.toLowerCase().trim());
  return { headers, rows: nonEmpty };
}

function detectDelimiter(content: string): string {
  const firstLine = content.split("\n", 1)[0] ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semicolons = (firstLine.match(/;/g) ?? []).length;
  const tabs = (firstLine.match(/\t/g) ?? []).length;
  if (semicolons > commas && semicolons >= tabs) return ";";
  if (tabs > commas && tabs > semicolons) return "\t";
  return ",";
}

const KNOWN_COLUMNS = new Set([
  "external_id",
  "id",
  "sku",
  "name",
  "title",
  "description",
  "category",
  "price",
  "currency",
  "stock_status",
  "stock",
  "images",
  "image",
  "active",
]);

const STOCK_ALIASES: Record<string, StockStatus> = {
  in_stock: StockStatus.IN_STOCK,
  "в наличии": StockStatus.IN_STOCK,
  yes: StockStatus.IN_STOCK,
  out_of_stock: StockStatus.OUT_OF_STOCK,
  "нет в наличии": StockStatus.OUT_OF_STOCK,
  no: StockStatus.OUT_OF_STOCK,
  on_order: StockStatus.ON_ORDER,
  "под заказ": StockStatus.ON_ORDER,
};

function pick(row: Record<string, string>, ...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value.length > 0) return value;
  }
  return undefined;
}

function parseAttributeValue(raw: string): string | number | boolean {
  const lowered = raw.toLowerCase();
  if (lowered === "true" || lowered === "да") return true;
  if (lowered === "false" || lowered === "нет") return false;
  if (/^-?\d+(\.\d+)?$/.test(raw)) return Number(raw);
  return raw;
}

/**
 * Превращает таблицу в набор товаров.
 * Неизвестные колонки становятся атрибутами — это позволяет магазину
 * загрузить свой файл без переименования полей.
 */
export function csvToProducts(table: CsvTable): ParsedImport {
  const products: ProductWriteInput[] = [];
  const errors: ImportRowError[] = [];

  if (table.headers.length === 0) {
    return { products, errors: [{ line: 1, message: "Файл пуст или не содержит заголовка" }] };
  }
  if (!table.headers.some((header) => header === "name" || header === "title")) {
    return {
      products,
      errors: [{ line: 1, message: "Обязательная колонка name (или title) отсутствует" }],
    };
  }

  table.rows.forEach((cells, index) => {
    const line = index + 2;
    const row: Record<string, string> = {};
    table.headers.forEach((header, columnIndex) => {
      row[header] = (cells[columnIndex] ?? "").trim();
    });

    const name = pick(row, "name", "title");
    if (!name) {
      errors.push({ line, message: "Пустое название товара" });
      return;
    }

    const priceRaw = pick(row, "price");
    const price = priceRaw ? parseAmount(priceRaw) : null;
    if (price === null || price < 0) {
      errors.push({ line, message: `Некорректная цена: "${priceRaw ?? ""}"` });
      return;
    }

    const currencyRaw = (pick(row, "currency") ?? Currency.UZS).toUpperCase();
    const currency = currencyRaw === Currency.USD ? Currency.USD : Currency.UZS;

    const stockRaw = (pick(row, "stock_status", "stock") ?? "").toLowerCase();
    const stockStatus = STOCK_ALIASES[stockRaw] ?? StockStatus.IN_STOCK;

    const imagesRaw = pick(row, "images", "image") ?? "";
    const images = imagesRaw
      .split(/[|;]/)
      .map((url) => url.trim())
      .filter((url) => /^https?:\/\//i.test(url));

    const activeRaw = (pick(row, "active") ?? "true").toLowerCase();
    const active = !["false", "0", "нет", "no"].includes(activeRaw);

    const attributes: ProductAttributes = {};
    for (const [key, value] of Object.entries(row)) {
      if (KNOWN_COLUMNS.has(key) || value.length === 0) continue;
      if (!isSafeAttributeKey(key)) continue;
      Object.defineProperty(attributes, key, {
        value: parseAttributeValue(value),
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }

    products.push({
      externalId: pick(row, "external_id", "sku", "id") ?? null,
      name,
      description: pick(row, "description") ?? null,
      category: pick(row, "category") ?? null,
      price,
      currency,
      images,
      attributes,
      stockStatus,
      active,
    });
  });

  return { products, errors };
}