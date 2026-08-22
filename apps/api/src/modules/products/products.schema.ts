import { z } from "zod";
import { Currency, StockStatus } from "@ai-sales/shared";

const MAX_PRICE = 1_000_000_000_000;

const FORBIDDEN_ATTRIBUTE_KEYS = ["__proto__", "constructor", "prototype"];

export const attributesSchema = z
  .record(z.union([z.string().max(500), z.number(), z.boolean()]))
  .refine(
    (value) => Object.keys(value).every((key) => !FORBIDDEN_ATTRIBUTE_KEYS.includes(key)),
    "Недопустимое имя атрибута",
  )
  .default({});

export const productIdSchema = z.object({ id: z.string().min(1) });

export const listProductsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  category: z.string().trim().max(100).optional(),
  minPrice: z.coerce.number().min(0).max(MAX_PRICE).optional(),
  maxPrice: z.coerce.number().min(0).max(MAX_PRICE).optional(),
  active: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
  stockStatus: z.nativeEnum(StockStatus).optional(),
  sort: z.enum(["price_asc", "price_desc", "newest", "name"]).default("newest"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createProductSchema = z
  .object({
    externalId: z.string().trim().max(100).nullable().default(null),
    name: z.string().trim().min(1, "Название обязательно").max(200),
    description: z.string().trim().max(4000).nullable().default(null),
    category: z.string().trim().max(100).nullable().default(null),
    price: z.number().min(0).max(MAX_PRICE),
    currency: z.nativeEnum(Currency).default(Currency.UZS),
    images: z.array(z.string().url()).max(10).default([]),
    attributes: attributesSchema,
    stockStatus: z.nativeEnum(StockStatus).default(StockStatus.IN_STOCK),
    active: z.boolean().default(true),
  })
  .strict();

export const updateProductSchema = createProductSchema.partial().strict();

export const importProductsSchema = z
  .object({
    csv: z.string().min(1, "Пустой CSV").max(5_000_000),
  })
  .strict();

export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;