import type { GuardedDatabase } from "../../core/prisma.js";
import type {
  AiSettingsEntity,
  FaqItemEntity,
  KnowledgeBaseEntity,
} from "../../domain/entities.js";
import type { KnowledgeRepository } from "../../domain/repositories.js";
import { mapAiSettings, mapFaq, mapKnowledge } from "./mappers.js";

export class PrismaKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly db: GuardedDatabase) {}

  async getKnowledge(companyId: string): Promise<KnowledgeBaseEntity | null> {
    const row = await this.db.knowledgeBase.findFirst({ where: { companyId } });
    return row ? mapKnowledge(row) : null;
  }

  async upsertKnowledge(
    companyId: string,
    data: Omit<KnowledgeBaseEntity, "companyId" | "updatedAt">,
  ): Promise<KnowledgeBaseEntity> {
    const row = await this.db.knowledgeBase.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });
    return mapKnowledge(row);
  }

  async listFaq(companyId: string, onlyActive: boolean): Promise<FaqItemEntity[]> {
    const rows = await this.db.faqItem.findMany({
      where: onlyActive ? { companyId, active: true } : { companyId },
      orderBy: [{ position: "asc" }, { createdAt: "asc" }],
    });
    return rows.map(mapFaq);
  }

  async createFaq(
    companyId: string,
    data: Omit<FaqItemEntity, "id" | "companyId">,
  ): Promise<FaqItemEntity> {
    const row = await this.db.faqItem.create({ data: { companyId, ...data } });
    return mapFaq(row);
  }

  async updateFaq(
    companyId: string,
    faqId: string,
    data: Partial<Omit<FaqItemEntity, "id" | "companyId">>,
  ): Promise<FaqItemEntity | null> {
    const result = await this.db.faqItem.updateMany({ where: { id: faqId, companyId }, data });
    if (result.count === 0) return null;
    const row = await this.db.faqItem.findFirst({ where: { id: faqId, companyId } });
    return row ? mapFaq(row) : null;
  }

  async deleteFaq(companyId: string, faqId: string): Promise<boolean> {
    const result = await this.db.faqItem.deleteMany({ where: { id: faqId, companyId } });
    return result.count > 0;
  }

  async getAiSettings(companyId: string): Promise<AiSettingsEntity | null> {
    const row = await this.db.aiSettings.findFirst({ where: { companyId } });
    return row ? mapAiSettings(row) : null;
  }

  async upsertAiSettings(
    companyId: string,
    data: Partial<Omit<AiSettingsEntity, "companyId">>,
  ): Promise<AiSettingsEntity> {
    const row = await this.db.aiSettings.upsert({
      where: { companyId },
      create: { companyId, ...data },
      update: data,
    });
    return mapAiSettings(row);
  }
}