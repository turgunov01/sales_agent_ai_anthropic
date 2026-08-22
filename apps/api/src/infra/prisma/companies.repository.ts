import type { PrismaClient } from "@prisma/client";
import type { GuardedDatabase } from "../../core/prisma.js";
import type { CompanyEntity, UserEntity } from "../../domain/entities.js";
import type {
  CompaniesRepository,
  CreateCompanyWithOwnerInput,
} from "../../domain/repositories.js";
import { mapCompany, mapUser } from "./mappers.js";

export class PrismaCompaniesRepository implements CompaniesRepository {
  constructor(
    private readonly db: GuardedDatabase,
    private readonly raw: PrismaClient,
  ) {}

  async findById(companyId: string): Promise<CompanyEntity | null> {
    const row = await this.db.company.findUnique({ where: { id: companyId } });
    return row ? mapCompany(row) : null;
  }

  async findBySlug(slug: string): Promise<CompanyEntity | null> {
    const row = await this.db.company.findUnique({ where: { slug } });
    return row ? mapCompany(row) : null;
  }

  async update(
    companyId: string,
    data: Partial<Pick<CompanyEntity, "name" | "phone" | "defaultLanguage">>,
  ): Promise<CompanyEntity> {
    const row = await this.db.company.update({ where: { id: companyId }, data });
    return mapCompany(row);
  }

  /**
   * Регистрация: компания, владелец, пустая база знаний и настройки AI
   * создаются одной транзакцией — половинчатый арендатор недопустим.
   */
  async createWithOwner(
    input: CreateCompanyWithOwnerInput,
  ): Promise<{ company: CompanyEntity; owner: UserEntity }> {
    const row = await this.raw.company.create({
      data: {
        name: input.company.name,
        slug: input.company.slug,
        phone: input.company.phone,
        defaultLanguage: input.company.defaultLanguage,
        users: {
          create: {
            email: input.owner.email,
            passwordHash: input.owner.passwordHash,
            fullName: input.owner.fullName,
            role: "OWNER",
          },
        },
        knowledge: { create: {} },
        aiSettings: { create: {} },
      },
      include: { users: true },
    });

    const ownerRow = row.users[0];
    if (!ownerRow) throw new Error("Владелец не создан вместе с компанией");

    return { company: mapCompany(row), owner: mapUser(ownerRow) };
  }
}