import type { Language } from "@ai-sales/shared";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { CustomerEntity } from "../../domain/entities.js";
import type { CustomerUpsertInput, CustomersRepository } from "../../domain/repositories.js";
import { mapCustomer } from "./mappers.js";

export class PrismaCustomersRepository implements CustomersRepository {
  constructor(private readonly db: GuardedDatabase) {}

  async upsert(companyId: string, input: CustomerUpsertInput): Promise<CustomerEntity> {
    const row = await this.db.customer.upsert({
      where: {
        companyId_channelType_externalId: {
          companyId,
          channelType: input.channelType,
          externalId: input.externalId,
        },
      },
      create: { companyId, ...input },
      update: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
      },
    });
    return mapCustomer(row);
  }

  async findById(companyId: string, customerId: string): Promise<CustomerEntity | null> {
    const row = await this.db.customer.findFirst({ where: { id: customerId, companyId } });
    return row ? mapCustomer(row) : null;
  }

  async setPhone(
    companyId: string,
    customerId: string,
    phone: string,
  ): Promise<CustomerEntity | null> {
    const result = await this.db.customer.updateMany({
      where: { id: customerId, companyId },
      data: { phone },
    });
    if (result.count === 0) return null;
    return this.findById(companyId, customerId);
  }

  async setLanguage(
    companyId: string,
    customerId: string,
    language: Language,
  ): Promise<CustomerEntity | null> {
    const result = await this.db.customer.updateMany({
      where: { id: customerId, companyId },
      data: { language },
    });
    if (result.count === 0) return null;
    return this.findById(companyId, customerId);
  }
}