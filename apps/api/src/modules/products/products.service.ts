import type { ProductDto } from "@ai-sales/shared";
import { badRequest, notFound } from "../../core/errors.js";
import { buildPaginationMeta } from "../../core/http/respond.js";
import type { AuthContext } from "../../core/security/tokens.js";
import type { PaginationMeta } from "@ai-sales/shared";
import type { ProductEntity } from "../../domain/entities.js";
import type { ProductFilter, Repositories } from "../../domain/repositories.js";
import { toProductDto } from "../shared/mappers.js";
import { csvToProducts, parseCsv, type ImportRowError } from "./csv.js";
import type {
  CreateProductInput,
  ListProductsQuery,
  UpdateProductInput,
} from "./products.schema.js";

export interface ImportReport {
  received: number;
  imported: number;
  updated: number;
  failed: number;
  errors: ImportRowError[];
}

export class ProductsService {
  constructor(private readonly repos: Repositories) {}

  async list(
    auth: AuthContext,
    query: ListProductsQuery,
  ): Promise<{ items: ProductDto[]; meta: PaginationMeta }> {
    if (
      query.minPrice !== undefined &&
      query.maxPrice !== undefined &&
      query.minPrice > query.maxPrice
    ) {
      throw badRequest("Минимальная цена больше максимальной");
    }

    const filter: ProductFilter = { sort: query.sort };
    if (query.q) filter.search = query.q;
    if (query.category) filter.category = query.category;
    if (query.minPrice !== undefined) filter.minPrice = query.minPrice;
    if (query.maxPrice !== undefined) filter.maxPrice = query.maxPrice;
    if (query.active !== undefined) filter.active = query.active;
    if (query.stockStatus) filter.stockStatus = query.stockStatus;

    const result = await this.repos.products.list(auth.companyId, filter, {
      page: query.page,
      limit: query.limit,
    });

    return {
      items: result.items.map(toProductDto),
      meta: buildPaginationMeta(query.page, query.limit, result.total),
    };
  }

  async get(auth: AuthContext, productId: string): Promise<ProductDto> {
    const product = await this.requireProduct(auth.companyId, productId);
    return toProductDto(product);
  }

  async create(auth: AuthContext, input: CreateProductInput): Promise<ProductDto> {
    const product = await this.repos.products.create(auth.companyId, input);
    return toProductDto(product);
  }

  async update(
    auth: AuthContext,
    productId: string,
    input: UpdateProductInput,
  ): Promise<ProductDto> {
    const updated = await this.repos.products.update(auth.companyId, productId, input);
    if (!updated) throw notFound("Товар не найден");
    return toProductDto(updated);
  }

  async remove(auth: AuthContext, productId: string): Promise<void> {
    const removed = await this.repos.products.softDelete(auth.companyId, productId);
    if (!removed) throw notFound("Товар не найден");
  }

  async categories(auth: AuthContext): Promise<string[]> {
    return this.repos.products.listCategories(auth.companyId);
  }

  /**
   * Импорт идемпотентен по external_id: повторная загрузка того же файла
   * обновляет товары, а не создаёт дубликаты.
   */
  async importCsv(auth: AuthContext, csv: string): Promise<ImportReport> {
    const table = parseCsv(csv);
    const { products, errors } = csvToProducts(table);

    let imported = 0;
    let updated = 0;
    const rowErrors: ImportRowError[] = [...errors];

    for (const [index, product] of products.entries()) {
      try {
        if (product.externalId) {
          const existing = await this.repos.products.findByExternalId(
            auth.companyId,
            product.externalId,
          );
          await this.repos.products.upsertByExternalId(auth.companyId, product);
          if (existing) updated += 1;
          else imported += 1;
        } else {
          await this.repos.products.create(auth.companyId, product);
          imported += 1;
        }
      } catch (error) {
        rowErrors.push({
          line: index + 2,
          message: error instanceof Error ? error.message : "Не удалось сохранить строку",
        });
      }
    }

    return {
      received: table.rows.length,
      imported,
      updated,
      failed: rowErrors.length,
      errors: rowErrors.slice(0, 50),
    };
  }

  private async requireProduct(companyId: string, productId: string): Promise<ProductEntity> {
    const product = await this.repos.products.findById(companyId, productId);
    if (!product) throw notFound("Товар не найден");
    return product;
  }
}