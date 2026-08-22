import type {
  ChannelType,
  ConversationStatus,
  Language,
  LeadEventType,
  LeadSource,
  LeadStatus,
  MessageRole,
  MessageType,
  UserRole,
} from "@ai-sales/shared";
import type {
  AiSettingsEntity,
  ChannelEntity,
  CompanyEntity,
  ConversationEntity,
  CustomerEntity,
  FaqItemEntity,
  KnowledgeBaseEntity,
  LeadEntity,
  LeadEventEntity,
  MessageEntity,
  ProductAttributes,
  ProductEntity,
  SessionEntity,
  UserEntity,
} from "./entities.js";

/**
 * Порты доступа к данным. Каждый метод, работающий с данными арендатора,
 * принимает companyId первым аргументом — это делает пропуск скоупа
 * заметным на уровне сигнатуры, а не только в рантайме.
 */

export interface Paged<T> {
  items: T[];
  total: number;
}

export interface PageQuery {
  page: number;
  limit: number;
}

// ─────────────────────────────── Компании ───────────────────────────────────

export interface CreateCompanyWithOwnerInput {
  company: { name: string; slug: string; phone: string | null; defaultLanguage: Language };
  owner: { email: string; passwordHash: string; fullName: string };
}

export interface CompaniesRepository {
  findById(companyId: string): Promise<CompanyEntity | null>;
  findBySlug(slug: string): Promise<CompanyEntity | null>;
  update(
    companyId: string,
    data: Partial<Pick<CompanyEntity, "name" | "phone" | "defaultLanguage">>,
  ): Promise<CompanyEntity>;
  createWithOwner(
    input: CreateCompanyWithOwnerInput,
  ): Promise<{ company: CompanyEntity; owner: UserEntity }>;
}

// ────────────────────────────── Пользователи ────────────────────────────────

export interface CreateUserInput {
  companyId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
}

export interface UsersRepository {
  findByEmail(email: string): Promise<UserEntity | null>;
  /** Сессия хранит только userId — компания определяется этим запросом. */
  findByIdUnscoped(userId: string): Promise<UserEntity | null>;
  findById(companyId: string, userId: string): Promise<UserEntity | null>;
  listByCompany(companyId: string): Promise<UserEntity[]>;
  countOwners(companyId: string): Promise<number>;
  create(input: CreateUserInput): Promise<UserEntity>;
  update(
    companyId: string,
    userId: string,
    data: Partial<Pick<UserEntity, "fullName" | "role" | "isActive" | "passwordHash">>,
  ): Promise<UserEntity | null>;
  delete(companyId: string, userId: string): Promise<boolean>;
  touchLastLogin(companyId: string, userId: string, at: Date): Promise<void>;
}

// ──────────────────────────────── Сессии ────────────────────────────────────

export interface SessionsRepository {
  create(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<SessionEntity>;
  findByHash(hash: string): Promise<SessionEntity | null>;
  revokeByHash(hash: string, at: Date): Promise<void>;
  revokeAllForUser(userId: string, at: Date): Promise<void>;
  deleteExpired(before: Date): Promise<number>;
}

// ──────────────────────────────── Каталог ───────────────────────────────────

export interface ProductFilter {
  search?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  active?: boolean;
  stockStatus?: string;
  attributes?: ProductAttributes;
  sort?: "price_asc" | "price_desc" | "newest" | "name";
}

export interface ProductWriteInput {
  externalId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  currency: ProductEntity["currency"];
  images: string[];
  attributes: ProductAttributes;
  stockStatus: ProductEntity["stockStatus"];
  active: boolean;
}

export interface ProductsRepository {
  list(companyId: string, filter: ProductFilter, page: PageQuery): Promise<Paged<ProductEntity>>;
  search(companyId: string, filter: ProductFilter, limit: number): Promise<ProductEntity[]>;
  findById(companyId: string, productId: string): Promise<ProductEntity | null>;
  findManyByIds(companyId: string, ids: string[]): Promise<ProductEntity[]>;
  findByExternalId(companyId: string, externalId: string): Promise<ProductEntity | null>;
  create(companyId: string, input: ProductWriteInput): Promise<ProductEntity>;
  update(
    companyId: string,
    productId: string,
    input: Partial<ProductWriteInput>,
  ): Promise<ProductEntity | null>;
  upsertByExternalId(companyId: string, input: ProductWriteInput): Promise<ProductEntity>;
  softDelete(companyId: string, productId: string): Promise<boolean>;
  listCategories(companyId: string): Promise<string[]>;
  countActive(companyId: string): Promise<number>;
  countAll(companyId: string): Promise<number>;
}

// ───────────────────────────── База знаний ──────────────────────────────────

export interface KnowledgeRepository {
  getKnowledge(companyId: string): Promise<KnowledgeBaseEntity | null>;
  upsertKnowledge(
    companyId: string,
    data: Omit<KnowledgeBaseEntity, "companyId" | "updatedAt">,
  ): Promise<KnowledgeBaseEntity>;
  listFaq(companyId: string, onlyActive: boolean): Promise<FaqItemEntity[]>;
  createFaq(
    companyId: string,
    data: Omit<FaqItemEntity, "id" | "companyId">,
  ): Promise<FaqItemEntity>;
  updateFaq(
    companyId: string,
    faqId: string,
    data: Partial<Omit<FaqItemEntity, "id" | "companyId">>,
  ): Promise<FaqItemEntity | null>;
  deleteFaq(companyId: string, faqId: string): Promise<boolean>;
  getAiSettings(companyId: string): Promise<AiSettingsEntity | null>;
  upsertAiSettings(
    companyId: string,
    data: Partial<Omit<AiSettingsEntity, "companyId">>,
  ): Promise<AiSettingsEntity>;
}

// ──────────────────────────────── Каналы ────────────────────────────────────

export interface ChannelWriteInput {
  type: ChannelType;
  botUsername: string | null;
  botExternalId: string | null;
  botTokenCiphertext: string;
  webhookSecret: string;
  isActive: boolean;
  lastConnectedAt: Date | null;
}

export interface ChannelsRepository {
  listByCompany(companyId: string): Promise<ChannelEntity[]>;
  findById(companyId: string, channelId: string): Promise<ChannelEntity | null>;
  /** Вебхук приходит без контекста компании: канал сам определяет арендатора. */
  findByIdUnscoped(channelId: string): Promise<ChannelEntity | null>;
  findByType(companyId: string, type: ChannelType): Promise<ChannelEntity | null>;
  /** Один бот принадлежит одной компании: проверка владельца до привязки. */
  findByBotExternalId(botExternalId: string): Promise<ChannelEntity | null>;
  upsertByType(companyId: string, input: ChannelWriteInput): Promise<ChannelEntity>;
  deactivate(companyId: string, channelId: string): Promise<boolean>;
}

// ──────────────────────────────── Клиенты ───────────────────────────────────

export interface CustomerUpsertInput {
  channelType: ChannelType;
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  language: Language;
}

export interface CustomersRepository {
  upsert(companyId: string, input: CustomerUpsertInput): Promise<CustomerEntity>;
  findById(companyId: string, customerId: string): Promise<CustomerEntity | null>;
  setPhone(companyId: string, customerId: string, phone: string): Promise<CustomerEntity | null>;
  setLanguage(
    companyId: string,
    customerId: string,
    language: Language,
  ): Promise<CustomerEntity | null>;
}

// ──────────────────────────── Диалоги и сообщения ───────────────────────────

export interface ConversationFilter {
  status?: ConversationStatus;
  assignedUserId?: string;
  customerId?: string;
}

export interface CreateMessageInput {
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  attachments?: unknown;
  toolCalls?: unknown;
  tokensIn?: number | null;
  tokensOut?: number | null;
}

export interface ConversationsRepository {
  list(
    companyId: string,
    filter: ConversationFilter,
    page: PageQuery,
  ): Promise<Paged<ConversationEntity>>;
  findById(companyId: string, conversationId: string): Promise<ConversationEntity | null>;
  findActiveForCustomer(
    companyId: string,
    customerId: string,
    notOlderThan: Date,
  ): Promise<ConversationEntity | null>;
  create(
    companyId: string,
    input: { customerId: string; channelId: string; language: Language },
  ): Promise<ConversationEntity>;
  update(
    companyId: string,
    conversationId: string,
    data: Partial<
      Pick<
        ConversationEntity,
        "status" | "assignedUserId" | "handoffReason" | "language" | "lastMessageAt" | "closedAt"
      >
    >,
  ): Promise<ConversationEntity | null>;
  addMessage(companyId: string, input: CreateMessageInput): Promise<MessageEntity>;
  listMessages(
    companyId: string,
    conversationId: string,
    limit: number,
  ): Promise<MessageEntity[]>;
  countAll(companyId: string, since?: Date): Promise<number>;
  countByStatus(companyId: string, status: ConversationStatus): Promise<number>;
  countMessages(companyId: string, since?: Date): Promise<{ total: number; assistant: number }>;
  listCreatedSince(companyId: string, since: Date): Promise<ConversationEntity[]>;
}

// ───────────────────────────────── Лиды ─────────────────────────────────────

export interface LeadFilter {
  status?: LeadStatus;
  assignedManagerId?: string;
  search?: string;
  from?: Date;
  to?: Date;
}

export interface LeadWriteInput {
  customerId: string;
  conversationId: string | null;
  name: string | null;
  phone: string | null;
  telegramUserId: string | null;
  source: LeadSource;
  interest: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: LeadEntity["currency"];
  status: LeadStatus;
  aiSummary: string | null;
  qualificationScore: number;
  interestedProductIds: string[];
  assignedManagerId: string | null;
}

export interface LeadsRepository {
  list(companyId: string, filter: LeadFilter, page: PageQuery): Promise<Paged<LeadEntity>>;
  findById(companyId: string, leadId: string): Promise<LeadEntity | null>;
  findOpenByConversation(companyId: string, conversationId: string): Promise<LeadEntity | null>;
  create(companyId: string, input: LeadWriteInput): Promise<LeadEntity>;
  update(
    companyId: string,
    leadId: string,
    data: Partial<LeadWriteInput> & { contactedAt?: Date | null; closedAt?: Date | null },
  ): Promise<LeadEntity | null>;
  addEvent(
    companyId: string,
    input: {
      leadId: string;
      type: LeadEventType;
      fromStatus: LeadStatus | null;
      toStatus: LeadStatus | null;
      comment: string | null;
      actorUserId: string | null;
    },
  ): Promise<LeadEventEntity>;
  listEvents(companyId: string, leadId: string): Promise<LeadEventEntity[]>;
  countByStatus(companyId: string, since?: Date): Promise<Record<LeadStatus, number>>;
  listCreatedSince(companyId: string, since: Date): Promise<LeadEntity[]>;
}

// ─────────────────────────────── Композиция ─────────────────────────────────

export interface Repositories {
  companies: CompaniesRepository;
  users: UsersRepository;
  sessions: SessionsRepository;
  products: ProductsRepository;
  knowledge: KnowledgeRepository;
  channels: ChannelsRepository;
  customers: CustomersRepository;
  conversations: ConversationsRepository;
  leads: LeadsRepository;
}