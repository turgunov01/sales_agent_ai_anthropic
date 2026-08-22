import type {
  AiSettingsDto,
  CompanyDto,
  FaqItemDto,
  KnowledgeBaseDto,
} from "@ai-sales/shared";
import { env } from "../../config/env.js";
import { notFound } from "../../core/errors.js";
import type { AuthContext } from "../../core/security/tokens.js";
import { normalizePhone } from "../../core/utils/phone.js";
import type { AiSettingsEntity, KnowledgeBaseEntity } from "../../domain/entities.js";
import type { Repositories } from "../../domain/repositories.js";
import { toAiSettingsDto, toCompanyDto, toFaqDto, toKnowledgeDto } from "../shared/mappers.js";
import type {
  CreateFaqInput,
  UpdateAiSettingsInput,
  UpdateCompanyInput,
  UpdateFaqInput,
  UpdateKnowledgeInput,
} from "./company.schema.js";

export const DEFAULT_AI_SETTINGS: Omit<AiSettingsEntity, "companyId"> = {
  enabled: true,
  assistantName: "Ассистент",
  tone: "Дружелюбный, вежливый, по делу",
  greeting: null,
  systemInstructions: null,
  autoCreateLead: true,
  model: env.OPENAI_MODEL,
  temperature: 0.3,
  maxTokens: 1024,
};

export class CompanyService {
  constructor(private readonly repos: Repositories) {}

  async getProfile(auth: AuthContext): Promise<CompanyDto> {
    const company = await this.repos.companies.findById(auth.companyId);
    if (!company) throw notFound("Компания не найдена");
    return toCompanyDto(company);
  }

  async updateProfile(auth: AuthContext, input: UpdateCompanyInput): Promise<CompanyDto> {
    const data: Parameters<Repositories["companies"]["update"]>[1] = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.defaultLanguage !== undefined) data.defaultLanguage = input.defaultLanguage;
    if (input.phone !== undefined) data.phone = input.phone ? normalizePhone(input.phone) : null;

    const company = await this.repos.companies.update(auth.companyId, data);
    return toCompanyDto(company);
  }

  async getKnowledge(auth: AuthContext): Promise<KnowledgeBaseDto> {
    return toKnowledgeDto(await this.repos.knowledge.getKnowledge(auth.companyId));
  }

  async updateKnowledge(
    auth: AuthContext,
    input: UpdateKnowledgeInput,
  ): Promise<KnowledgeBaseDto> {
    const saved = await this.repos.knowledge.upsertKnowledge(auth.companyId, input);
    return toKnowledgeDto(saved);
  }

  async listFaq(auth: AuthContext): Promise<FaqItemDto[]> {
    const items = await this.repos.knowledge.listFaq(auth.companyId, false);
    return items.map(toFaqDto);
  }

  async createFaq(auth: AuthContext, input: CreateFaqInput): Promise<FaqItemDto> {
    return toFaqDto(await this.repos.knowledge.createFaq(auth.companyId, input));
  }

  async updateFaq(auth: AuthContext, faqId: string, input: UpdateFaqInput): Promise<FaqItemDto> {
    const updated = await this.repos.knowledge.updateFaq(auth.companyId, faqId, input);
    if (!updated) throw notFound("Вопрос не найден");
    return toFaqDto(updated);
  }

  async deleteFaq(auth: AuthContext, faqId: string): Promise<void> {
    const deleted = await this.repos.knowledge.deleteFaq(auth.companyId, faqId);
    if (!deleted) throw notFound("Вопрос не найден");
  }

  async getAiSettings(auth: AuthContext): Promise<AiSettingsDto> {
    const settings = await this.repos.knowledge.getAiSettings(auth.companyId);
    return toAiSettingsDto(settings ?? { companyId: auth.companyId, ...DEFAULT_AI_SETTINGS });
  }

  async updateAiSettings(
    auth: AuthContext,
    input: UpdateAiSettingsInput,
  ): Promise<AiSettingsDto> {
    const saved = await this.repos.knowledge.upsertAiSettings(auth.companyId, input);
    return toAiSettingsDto(saved);
  }

  /** Полный контекст компании для сборки system prompt — один вызов вместо четырёх. */
  async loadAiContext(companyId: string): Promise<{
    company: CompanyDto;
    knowledge: KnowledgeBaseEntity | null;
    faq: Awaited<ReturnType<Repositories["knowledge"]["listFaq"]>>;
    settings: AiSettingsEntity;
  }> {
    const [company, knowledge, faq, settings] = await Promise.all([
      this.repos.companies.findById(companyId),
      this.repos.knowledge.getKnowledge(companyId),
      this.repos.knowledge.listFaq(companyId, true),
      this.repos.knowledge.getAiSettings(companyId),
    ]);

    if (!company) throw notFound("Компания не найдена");

    return {
      company: toCompanyDto(company),
      knowledge,
      faq,
      settings: settings ?? { companyId, ...DEFAULT_AI_SETTINGS },
    };
  }
}