import { Prisma } from "@prisma/client";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { ProductAttributes, ProductEntity } from "../../domain/entities.js";
import type {
  Paged,
  PageQuery,
  ProductFilter,
  ProductWriteInput,
  ProductsRepository,
} from "../../domain/repositories.js";
import { mapProduct } from "./mappers.js";

type ProductWhere = Prisma.ProductWhereInput;

function buildWhere(companyId: string, filter: ProductFilter): ProductWhere {
  const where: ProductWhere = { companyId };

  if (filter.active !== undefined) where.active = filter.active;
  if (filter.category) where.category = { equals: filter.category, mode: "insensitive" };
  if (filter.stockStatus) {
    where.stockStatus = filter.stockStatus as ProductEntity["stockStatus"];
  }

  if (filter.minPrice !== undefined || filter.maxPrice !== undefined) {
    where.price = {
      ...(filter.minPrice !== undefined ? { gte: new Prisma.Decimal(filter.minPrice) } : {}),
      ...(filter.maxPrice !== undefined ? { lte: new Prisma.Decimal(filter.maxPrice) } : {}),
    };
  }

  const search = filter.search?.trim();
  if (search) {
    where.OR = [
      { name: { contains: search, mode: "insensitive" } },
      { description: { contains: search, mode: "insensitive" } },
      { category: { contains: search, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: ProductFilter["sort"]): Prisma.ProductOrderByWithRelationInput {
  switch (sort) {
    case "price_asc":
      return { price: "asc" };
    case "price_desc":
      return { price: "desc" };
    case "name":
      return { name: "asc" };
    default:
      return { createdAt: "desc" };
  }
}

/** Фильтр по атрибутам применяется в памяти: JSON-пути Prisma избыточны для MVP. */
export function matchesAttributes(
  product: Pick<ProductEntity, "attributes">,
  required: ProductAttributes | undefined,
): boolean {
  if (!required) return true;
  return Object.entries(required).every(([key, expected]) => {
    const actual = product.attributes[key];
    if (actual === undefined) return false;
    return String(actual).toLowerCase() === String(expected).toLowerCase();
  });
}

export class PrismaProductsRepository implements ProductsRepository {
  constructor(private readonly db: GuardedDatabase) {}

  async list(
    companyId: string,
    filter: ProductFilter,
    page: PageQuery,
  ): Promise<Paged<ProductEntity>> {
    const where = buildWhere(companyId, filter);
    const [rows, total] = await Promise.all([
      this.db.product.findMany({
        where,
        orderBy: buildOrderBy(filter.sort),
        skip: (page.page - 1) * page.limit,
        take: page.limit,
      }),
      this.db.product.count({ where }),
    ]);
    return { items: rows.map(mapProduct), total };
  }

  async search(
    companyId: string,
    filter: ProductFilter,
    limit: number,
  ): Promise<ProductEntity[]> {
    const where = buildWhere(companyId, { ...filter, active: filter.active ?? true });
    const rows = await this.db.product.findMany({
      where,
      orderBy: buildOrderBy(filter.sort ?? "price_asc"),
      take: filter.attributes ? limit * 5 : limit,
    });
    return rows
      .map(mapProduct)
      .filter((product) => matchesAttributes(product, filter.attributes))
      .slice(0, limit);
  }

  async findById(companyId: string, productId: string): Promise<ProductEntity | null> {
    const row = await this.db.product.findFirst({ where: { id: productId, companyId } });
    return row ? mapProduct(row) : null;
  }

  async findManyByIds(companyId: string, ids: string[]): Promise<ProductEntity[]> {
    if (ids.length === 0) return [];
    const rows = await this.db.product.findMany({ where: { companyId, id: { in: ids } } });
    return rows.map(mapProduct);
  }

  async findByExternalId(companyId: string, externalId: string): Promise<ProductEntity | null> {
    const row = await this.db.product.findFirst({ where: { companyId, externalId } });
    return row ? mapProduct(row) : null;
  }

  async create(companyId: string, input: ProductWriteInput): Promise<ProductEntity> {
    const row = await this.db.product.create({
      data: {
        companyId,
        externalId: input.externalId,
        name: input.name,
        description: input.description,
        category: input.category,
        price: new Prisma.Decimal(input.price),
        currency: input.currency,
        images: input.images,
        attributes: input.attributes as Prisma.InputJsonValue,
        stockStatus: input.stockStatus,
        active: input.active,
      },
    });
    return mapProduct(row);
  }

  async update(
    companyId: string,
    productId: string,
    input: Partial<ProductWriteInput>,
  ): Promise<ProductEntity | null> {
    const data: Prisma.ProductUncheckedUpdateManyInput = {};
    if (input.externalId !== undefined) data.externalId = input.externalId;
    if (input.name !== undefined) data.name = input.name;
    if (input.description !== undefined) data.description = input.description;
    if (input.category !== undefined) data.category = input.category;
    if (input.price !== undefined) data.price = new Prisma.Decimal(input.price);
    if (input.currency !== undefined) data.currency = input.currency;
    if (input.images !== undefined) data.images = input.images;
    if (input.attributes !== undefined) data.attributes = input.attributes as Prisma.InputJsonValue;
    if (input.stockStatus !== undefined) data.stockStatus = input.stockStatus;
    if (input.active !== undefined) data.active = input.active;

    const result = await this.db.product.updateMany({ where: { id: productId, companyId }, data });
    if (result.count === 0) return null;
    return this.findById(companyId, productId);
  }

  async upsertByExternalId(companyId: string, input: ProductWriteInput): Promise<ProductEntity> {
    if (!input.externalId) return this.create(companyId, input);

    const row = await this.db.product.upsert({
      where: { companyId_externalId: { companyId, externalId: input.externalId } },
      create: {
        companyId,
        externalId: input.externalId,
        name: input.name,
        description: input.description,
        category: input.category,
        price: new Prisma.Decimal(input.price),
        currency: input.currency,
        images: input.images,
        attributes: input.attributes as Prisma.InputJsonValue,
        stockStatus: input.stockStatus,
        active: input.active,
      },
      update: {
        name: input.name,
        description: input.description,
        category: input.category,
        price: new Prisma.Decimal(input.price),
        currency: input.currency,
        images: input.images,
        attributes: input.attributes as Prisma.InputJsonValue,
        stockStatus: input.stockStatus,
        active: input.active,
      },
    });
    return mapProduct(row);
  }

  async softDelete(companyId: string, productId: string): Promise<boolean> {
    const result = await this.db.product.updateMany({
      where: { id: productId, companyId },
      data: { active: false },
    });
    return result.count > 0;
  }

  async listCategories(companyId: string): Promise<string[]> {
    const rows = await this.db.product.findMany({
      where: { companyId, active: true, category: { not: null } },
      distinct: ["category"],
      select: { category: true },
      orderBy: { category: "asc" },
    });
    return rows.map((row) => row.category).filter((value): value is string => Boolean(value));
  }

  async countActive(companyId: string): Promise<number> {
    return this.db.product.count({ where: { companyId, active: true } });
  }

  async countAll(companyId: string): Promise<number> {
    return this.db.product.count({ where: { companyId } });
  }
}