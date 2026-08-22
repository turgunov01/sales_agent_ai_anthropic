import {
  ChannelType,
  CompanyStatus,
  ConversationStatus,
  Currency,
  Language,
  LeadStatus,
  MessageRole,
  StockStatus,
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
  ProductEntity,
  SessionEntity,
  UserEntity,
} from "../../src/domain/entities.js";
import type {
  ChannelWriteInput,
  ChannelsRepository,
  CompaniesRepository,
  ConversationFilter,
  ConversationsRepository,
  CreateCompanyWithOwnerInput,
  CreateMessageInput,
  CreateUserInput,
  CustomerUpsertInput,
  CustomersRepository,
  KnowledgeRepository,
  LeadFilter,
  LeadWriteInput,
  LeadsRepository,
  Paged,
  PageQuery,
  ProductFilter,
  ProductWriteInput,
  ProductsRepository,
  Repositories,
  SessionsRepository,
  UsersRepository,
} from "../../src/domain/repositories.js";
import { matchesAttributes } from "../../src/infra/prisma/products.repository.js";

/**
 * Хранилище в памяти, реализующее те же контракты, что и Prisma-репозитории:
 * реальная фильтрация, сортировка, пагинация, уникальные ключи и скоуп по companyId.
 * Это не заглушка — интеграционные тесты проверяют настоящую логику сервисов.
 */
export class FakeStore {
  companies: CompanyEntity[] = [];
  users: UserEntity[] = [];
  sessions: SessionEntity[] = [];
  products: ProductEntity[] = [];
  knowledge: KnowledgeBaseEntity[] = [];
  faq: FaqItemEntity[] = [];
  aiSettings: AiSettingsEntity[] = [];
  channels: ChannelEntity[] = [];
  customers: CustomerEntity[] = [];
  conversations: ConversationEntity[] = [];
  messages: MessageEntity[] = [];
  leads: LeadEntity[] = [];
  leadEvents: LeadEventEntity[] = [];

  private counter = 0;
  private clock = new Date("2026-08-22T09:00:00.000Z").getTime();

  id(prefix: string): string {
    this.counter += 1;
    return `${prefix}_${this.counter.toString().padStart(4, "0")}`;
  }

  /** Монотонное время: гарантирует стабильный порядок сортировки в тестах. */
  now(): Date {
    this.clock += 1000;
    return new Date(this.clock);
  }
}

const clone = <T>(value: T): T => structuredClone(value);

function paginate<T>(items: T[], page: PageQuery): Paged<T> {
  const start = (page.page - 1) * page.limit;
  return { items: items.slice(start, start + page.limit).map(clone), total: items.length };
}

class FakeCompaniesRepository implements CompaniesRepository {
  constructor(private readonly store: FakeStore) {}

  async findById(companyId: string): Promise<CompanyEntity | null> {
    const found = this.store.companies.find((company) => company.id === companyId);
    return found ? clone(found) : null;
  }

  async findBySlug(slug: string): Promise<CompanyEntity | null> {
    const found = this.store.companies.find((company) => company.slug === slug);
    return found ? clone(found) : null;
  }

  async update(
    companyId: string,
    data: Partial<Pick<CompanyEntity, "name" | "phone" | "defaultLanguage">>,
  ): Promise<CompanyEntity> {
    const company = this.store.companies.find((entry) => entry.id === companyId);
    if (!company) throw new Error("Компания не найдена");
    Object.assign(company, data, { updatedAt: this.store.now() });
    return clone(company);
  }

  async createWithOwner(
    input: CreateCompanyWithOwnerInput,
  ): Promise<{ company: CompanyEntity; owner: UserEntity }> {
    const at = this.store.now();
    const company: CompanyEntity = {
      id: this.store.id("cmp"),
      name: input.company.name,
      slug: input.company.slug,
      phone: input.company.phone,
      status: CompanyStatus.ACTIVE,
      defaultLanguage: input.company.defaultLanguage,
      createdAt: at,
      updatedAt: at,
    };
    const owner: UserEntity = {
      id: this.store.id("usr"),
      companyId: company.id,
      email: input.owner.email.toLowerCase(),
      passwordHash: input.owner.passwordHash,
      fullName: input.owner.fullName,
      role: UserRole.OWNER,
      isActive: true,
      lastLoginAt: null,
      createdAt: at,
      updatedAt: at,
    };

    this.store.companies.push(company);
    this.store.users.push(owner);
    this.store.knowledge.push({
      companyId: company.id,
      about: null,
      address: null,
      workingHours: null,
      delivery: null,
      payment: null,
      warranty: null,
      managerInstructions: null,
      updatedAt: at,
    });
    this.store.aiSettings.push({
      companyId: company.id,
      enabled: true,
      assistantName: "Ассистент",
      tone: "Дружелюбный, вежливый, по делу",
      greeting: null,
      systemInstructions: null,
      autoCreateLead: true,
      model: "gpt-4.1-mini",
      temperature: 0.3,
      maxTokens: 1024,
    });

    return { company: clone(company), owner: clone(owner) };
  }
}

class FakeUsersRepository implements UsersRepository {
  constructor(private readonly store: FakeStore) {}

  async findByEmail(email: string): Promise<UserEntity | null> {
    const found = this.store.users.find((user) => user.email === email.toLowerCase());
    return found ? clone(found) : null;
  }

  async findByIdUnscoped(userId: string): Promise<UserEntity | null> {
    const found = this.store.users.find((user) => user.id === userId);
    return found ? clone(found) : null;
  }

  async findById(companyId: string, userId: string): Promise<UserEntity | null> {
    const found = this.store.users.find(
      (user) => user.id === userId && user.companyId === companyId,
    );
    return found ? clone(found) : null;
  }

  async listByCompany(companyId: string): Promise<UserEntity[]> {
    return this.store.users
      .filter((user) => user.companyId === companyId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
  }

  async countOwners(companyId: string): Promise<number> {
    return this.store.users.filter(
      (user) => user.companyId === companyId && user.role === UserRole.OWNER && user.isActive,
    ).length;
  }

  async create(input: CreateUserInput): Promise<UserEntity> {
    const at = this.store.now();
    const user: UserEntity = {
      id: this.store.id("usr"),
      companyId: input.companyId,
      email: input.email.toLowerCase(),
      passwordHash: input.passwordHash,
      fullName: input.fullName,
      role: input.role,
      isActive: true,
      lastLoginAt: null,
      createdAt: at,
      updatedAt: at,
    };
    this.store.users.push(user);
    return clone(user);
  }

  async update(
    companyId: string,
    userId: string,
    data: Partial<Pick<UserEntity, "fullName" | "role" | "isActive" | "passwordHash">>,
  ): Promise<UserEntity | null> {
    const user = this.store.users.find(
      (entry) => entry.id === userId && entry.companyId === companyId,
    );
    if (!user) return null;
    Object.assign(user, data, { updatedAt: this.store.now() });
    return clone(user);
  }

  async delete(companyId: string, userId: string): Promise<boolean> {
    const index = this.store.users.findIndex(
      (user) => user.id === userId && user.companyId === companyId,
    );
    if (index === -1) return false;
    this.store.users.splice(index, 1);
    return true;
  }

  async touchLastLogin(companyId: string, userId: string, at: Date): Promise<void> {
    const user = this.store.users.find(
      (entry) => entry.id === userId && entry.companyId === companyId,
    );
    if (user) user.lastLoginAt = at;
  }
}

class FakeSessionsRepository implements SessionsRepository {
  constructor(private readonly store: FakeStore) {}

  async create(input: {
    userId: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ip: string | null;
    expiresAt: Date;
  }): Promise<SessionEntity> {
    const session: SessionEntity = {
      id: this.store.id("ses"),
      userId: input.userId,
      refreshTokenHash: input.refreshTokenHash,
      userAgent: input.userAgent,
      ip: input.ip,
      expiresAt: input.expiresAt,
      revokedAt: null,
      createdAt: this.store.now(),
    };
    this.store.sessions.push(session);
    return clone(session);
  }

  async findByHash(hash: string): Promise<SessionEntity | null> {
    const found = this.store.sessions.find((session) => session.refreshTokenHash === hash);
    return found ? clone(found) : null;
  }

  async revokeByHash(hash: string, at: Date): Promise<void> {
    const session = this.store.sessions.find((entry) => entry.refreshTokenHash === hash);
    if (session && !session.revokedAt) session.revokedAt = at;
  }

  async revokeAllForUser(userId: string, at: Date): Promise<void> {
    for (const session of this.store.sessions) {
      if (session.userId === userId && !session.revokedAt) session.revokedAt = at;
    }
  }

  async deleteExpired(before: Date): Promise<number> {
    const initial = this.store.sessions.length;
    this.store.sessions = this.store.sessions.filter(
      (session) => session.expiresAt.getTime() >= before.getTime(),
    );
    return initial - this.store.sessions.length;
  }
}
class FakeProductsRepository implements ProductsRepository {
  constructor(private readonly store: FakeStore) {}

  private apply(companyId: string, filter: ProductFilter): ProductEntity[] {
    let items = this.store.products.filter((product) => product.companyId === companyId);

    if (filter.active !== undefined) items = items.filter((p) => p.active === filter.active);
    if (filter.category) {
      const category = filter.category.toLowerCase();
      items = items.filter((p) => (p.category ?? "").toLowerCase() === category);
    }
    if (filter.stockStatus) items = items.filter((p) => p.stockStatus === filter.stockStatus);

    const minPrice = filter.minPrice;
    if (minPrice !== undefined) items = items.filter((p) => p.price >= minPrice);
    const maxPrice = filter.maxPrice;
    if (maxPrice !== undefined) items = items.filter((p) => p.price <= maxPrice);

    const search = filter.search?.trim().toLowerCase();
    if (search) {
      items = items.filter((p) =>
        [p.name, p.description ?? "", p.category ?? ""].some((field) =>
          field.toLowerCase().includes(search),
        ),
      );
    }

    if (filter.attributes) {
      items = items.filter((product) => matchesAttributes(product, filter.attributes));
    }

    const sorted = [...items];
    switch (filter.sort) {
      case "price_asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "price_desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "name":
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      default:
        sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
    return sorted;
  }

  async list(
    companyId: string,
    filter: ProductFilter,
    page: PageQuery,
  ): Promise<Paged<ProductEntity>> {
    return paginate(this.apply(companyId, filter), page);
  }

  async search(companyId: string, filter: ProductFilter, limit: number): Promise<ProductEntity[]> {
    return this.apply(companyId, { ...filter, active: filter.active ?? true })
      .slice(0, limit)
      .map(clone);
  }

  async findById(companyId: string, productId: string): Promise<ProductEntity | null> {
    const found = this.store.products.find(
      (product) => product.id === productId && product.companyId === companyId,
    );
    return found ? clone(found) : null;
  }

  async findManyByIds(companyId: string, ids: string[]): Promise<ProductEntity[]> {
    return this.store.products
      .filter((product) => product.companyId === companyId && ids.includes(product.id))
      .map(clone);
  }

  async findByExternalId(companyId: string, externalId: string): Promise<ProductEntity | null> {
    const found = this.store.products.find(
      (product) => product.companyId === companyId && product.externalId === externalId,
    );
    return found ? clone(found) : null;
  }

  async create(companyId: string, input: ProductWriteInput): Promise<ProductEntity> {
    const at = this.store.now();
    const product: ProductEntity = {
      id: this.store.id("prd"),
      companyId,
      externalId: input.externalId,
      name: input.name,
      description: input.description,
      category: input.category,
      price: input.price,
      currency: input.currency ?? Currency.UZS,
      images: input.images ?? [],
      attributes: input.attributes ?? {},
      stockStatus: input.stockStatus ?? StockStatus.IN_STOCK,
      active: input.active ?? true,
      createdAt: at,
      updatedAt: at,
    };
    this.store.products.push(product);
    return clone(product);
  }

  async update(
    companyId: string,
    productId: string,
    input: Partial<ProductWriteInput>,
  ): Promise<ProductEntity | null> {
    const product = this.store.products.find(
      (entry) => entry.id === productId && entry.companyId === companyId,
    );
    if (!product) return null;
    Object.assign(product, input, { updatedAt: this.store.now() });
    return clone(product);
  }

  async upsertByExternalId(companyId: string, input: ProductWriteInput): Promise<ProductEntity> {
    if (!input.externalId) return this.create(companyId, input);
    const existing = this.store.products.find(
      (product) => product.companyId === companyId && product.externalId === input.externalId,
    );
    if (!existing) return this.create(companyId, input);
    Object.assign(existing, input, { updatedAt: this.store.now() });
    return clone(existing);
  }

  async softDelete(companyId: string, productId: string): Promise<boolean> {
    const product = this.store.products.find(
      (entry) => entry.id === productId && entry.companyId === companyId,
    );
    if (!product) return false;
    product.active = false;
    return true;
  }

  async listCategories(companyId: string): Promise<string[]> {
    const categories = new Set<string>();
    for (const product of this.store.products) {
      if (product.companyId === companyId && product.active && product.category) {
        categories.add(product.category);
      }
    }
    return [...categories].sort();
  }

  async countActive(companyId: string): Promise<number> {
    return this.store.products.filter((p) => p.companyId === companyId && p.active).length;
  }

  async countAll(companyId: string): Promise<number> {
    return this.store.products.filter((p) => p.companyId === companyId).length;
  }
}

class FakeKnowledgeRepository implements KnowledgeRepository {
  constructor(private readonly store: FakeStore) {}

  async getKnowledge(companyId: string): Promise<KnowledgeBaseEntity | null> {
    const found = this.store.knowledge.find((entry) => entry.companyId === companyId);
    return found ? clone(found) : null;
  }

  async upsertKnowledge(
    companyId: string,
    data: Omit<KnowledgeBaseEntity, "companyId" | "updatedAt">,
  ): Promise<KnowledgeBaseEntity> {
    let entry = this.store.knowledge.find((item) => item.companyId === companyId);
    if (!entry) {
      entry = { companyId, ...data, updatedAt: this.store.now() };
      this.store.knowledge.push(entry);
    } else {
      Object.assign(entry, data, { updatedAt: this.store.now() });
    }
    return clone(entry);
  }

  async listFaq(companyId: string, onlyActive: boolean): Promise<FaqItemEntity[]> {
    return this.store.faq
      .filter((item) => item.companyId === companyId && (!onlyActive || item.active))
      .sort((a, b) => a.position - b.position)
      .map(clone);
  }

  async createFaq(
    companyId: string,
    data: Omit<FaqItemEntity, "id" | "companyId">,
  ): Promise<FaqItemEntity> {
    const item: FaqItemEntity = { id: this.store.id("faq"), companyId, ...data };
    this.store.faq.push(item);
    return clone(item);
  }

  async updateFaq(
    companyId: string,
    faqId: string,
    data: Partial<Omit<FaqItemEntity, "id" | "companyId">>,
  ): Promise<FaqItemEntity | null> {
    const item = this.store.faq.find((entry) => entry.id === faqId && entry.companyId === companyId);
    if (!item) return null;
    Object.assign(item, data);
    return clone(item);
  }

  async deleteFaq(companyId: string, faqId: string): Promise<boolean> {
    const index = this.store.faq.findIndex(
      (entry) => entry.id === faqId && entry.companyId === companyId,
    );
    if (index === -1) return false;
    this.store.faq.splice(index, 1);
    return true;
  }

  async getAiSettings(companyId: string): Promise<AiSettingsEntity | null> {
    const found = this.store.aiSettings.find((entry) => entry.companyId === companyId);
    return found ? clone(found) : null;
  }

  async upsertAiSettings(
    companyId: string,
    data: Partial<Omit<AiSettingsEntity, "companyId">>,
  ): Promise<AiSettingsEntity> {
    let entry = this.store.aiSettings.find((item) => item.companyId === companyId);
    if (!entry) {
      entry = {
        companyId,
        enabled: true,
        assistantName: "Ассистент",
        tone: "Дружелюбный",
        greeting: null,
        systemInstructions: null,
        autoCreateLead: true,
        model: "gpt-4.1-mini",
        temperature: 0.3,
        maxTokens: 1024,
        ...data,
      };
      this.store.aiSettings.push(entry);
    } else {
      Object.assign(entry, data);
    }
    return clone(entry);
  }
}

class FakeChannelsRepository implements ChannelsRepository {
  constructor(private readonly store: FakeStore) {}

  async listByCompany(companyId: string): Promise<ChannelEntity[]> {
    return this.store.channels.filter((channel) => channel.companyId === companyId).map(clone);
  }

  async findById(companyId: string, channelId: string): Promise<ChannelEntity | null> {
    const found = this.store.channels.find(
      (channel) => channel.id === channelId && channel.companyId === companyId,
    );
    return found ? clone(found) : null;
  }

  async findByIdUnscoped(channelId: string): Promise<ChannelEntity | null> {
    const found = this.store.channels.find((channel) => channel.id === channelId);
    return found ? clone(found) : null;
  }

  async findByType(companyId: string, type: ChannelType): Promise<ChannelEntity | null> {
    const found = this.store.channels.find(
      (channel) => channel.companyId === companyId && channel.type === type,
    );
    return found ? clone(found) : null;
  }

  async findByBotExternalId(botExternalId: string): Promise<ChannelEntity | null> {
    const found = this.store.channels.find((c) => c.botExternalId === botExternalId);
    return found ? clone(found) : null;
  }

  async upsertByType(companyId: string, input: ChannelWriteInput): Promise<ChannelEntity> {
    let channel = this.store.channels.find(
      (entry) => entry.companyId === companyId && entry.type === input.type,
    );
    if (!channel) {
      channel = { id: this.store.id("chn"), companyId, ...input, createdAt: this.store.now() };
      this.store.channels.push(channel);
    } else {
      Object.assign(channel, input);
    }
    return clone(channel);
  }

  async deactivate(companyId: string, channelId: string): Promise<boolean> {
    const channel = this.store.channels.find(
      (entry) => entry.id === channelId && entry.companyId === companyId,
    );
    if (!channel) return false;
    channel.isActive = false;
    channel.botExternalId = null;
    return true;
  }
}
class FakeCustomersRepository implements CustomersRepository {
  constructor(private readonly store: FakeStore) {}

  async upsert(companyId: string, input: CustomerUpsertInput): Promise<CustomerEntity> {
    let customer = this.store.customers.find(
      (entry) =>
        entry.companyId === companyId &&
        entry.channelType === input.channelType &&
        entry.externalId === input.externalId,
    );

    if (!customer) {
      const at = this.store.now();
      customer = {
        id: this.store.id("cus"),
        companyId,
        channelType: input.channelType,
        externalId: input.externalId,
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        phone: null,
        language: input.language,
        createdAt: at,
        updatedAt: at,
      };
      this.store.customers.push(customer);
    } else {
      customer.firstName = input.firstName;
      customer.lastName = input.lastName;
      customer.username = input.username;
      customer.updatedAt = this.store.now();
    }
    return clone(customer);
  }

  async findById(companyId: string, customerId: string): Promise<CustomerEntity | null> {
    const found = this.store.customers.find(
      (customer) => customer.id === customerId && customer.companyId === companyId,
    );
    return found ? clone(found) : null;
  }

  async setPhone(
    companyId: string,
    customerId: string,
    phone: string,
  ): Promise<CustomerEntity | null> {
    const customer = this.store.customers.find(
      (entry) => entry.id === customerId && entry.companyId === companyId,
    );
    if (!customer) return null;
    customer.phone = phone;
    return clone(customer);
  }

  async setLanguage(
    companyId: string,
    customerId: string,
    language: Language,
  ): Promise<CustomerEntity | null> {
    const customer = this.store.customers.find(
      (entry) => entry.id === customerId && entry.companyId === companyId,
    );
    if (!customer) return null;
    customer.language = language;
    return clone(customer);
  }
}

class FakeConversationsRepository implements ConversationsRepository {
  constructor(private readonly store: FakeStore) {}

  async list(
    companyId: string,
    filter: ConversationFilter,
    page: PageQuery,
  ): Promise<Paged<ConversationEntity>> {
    let items = this.store.conversations.filter((c) => c.companyId === companyId);
    if (filter.status) items = items.filter((c) => c.status === filter.status);
    if (filter.assignedUserId) {
      items = items.filter((c) => c.assignedUserId === filter.assignedUserId);
    }
    if (filter.customerId) items = items.filter((c) => c.customerId === filter.customerId);
    items = [...items].sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
    return paginate(items, page);
  }

  async findById(companyId: string, conversationId: string): Promise<ConversationEntity | null> {
    const found = this.store.conversations.find(
      (entry) => entry.id === conversationId && entry.companyId === companyId,
    );
    return found ? clone(found) : null;
  }

  async findActiveForCustomer(
    companyId: string,
    customerId: string,
    notOlderThan: Date,
  ): Promise<ConversationEntity | null> {
    const found = this.store.conversations
      .filter(
        (entry) =>
          entry.companyId === companyId &&
          entry.customerId === customerId &&
          entry.status !== ConversationStatus.CLOSED &&
          entry.lastMessageAt.getTime() >= notOlderThan.getTime(),
      )
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime())[0];
    return found ? clone(found) : null;
  }

  async create(
    companyId: string,
    input: { customerId: string; channelId: string; language: Language },
  ): Promise<ConversationEntity> {
    const at = this.store.now();
    const conversation: ConversationEntity = {
      id: this.store.id("cnv"),
      companyId,
      customerId: input.customerId,
      channelId: input.channelId,
      status: ConversationStatus.ACTIVE,
      language: input.language,
      assignedUserId: null,
      handoffReason: null,
      lastMessageAt: at,
      createdAt: at,
      closedAt: null,
    };
    this.store.conversations.push(conversation);
    return clone(conversation);
  }

  async update(
    companyId: string,
    conversationId: string,
    data: Partial<
      Pick<
        ConversationEntity,
        "status" | "assignedUserId" | "handoffReason" | "language" | "lastMessageAt" | "closedAt"
      >
    >,
  ): Promise<ConversationEntity | null> {
    const conversation = this.store.conversations.find(
      (entry) => entry.id === conversationId && entry.companyId === companyId,
    );
    if (!conversation) return null;
    Object.assign(conversation, data);
    return clone(conversation);
  }

  async addMessage(companyId: string, input: CreateMessageInput): Promise<MessageEntity> {
    const at = this.store.now();
    const message: MessageEntity = {
      id: this.store.id("msg"),
      companyId,
      conversationId: input.conversationId,
      role: input.role,
      type: input.type,
      content: input.content,
      attachments: input.attachments ?? null,
      toolCalls: input.toolCalls ?? null,
      tokensIn: input.tokensIn ?? null,
      tokensOut: input.tokensOut ?? null,
      createdAt: at,
    };
    this.store.messages.push(message);

    const conversation = this.store.conversations.find(
      (entry) => entry.id === input.conversationId && entry.companyId === companyId,
    );
    if (conversation) conversation.lastMessageAt = at;

    return clone(message);
  }

  async listMessages(
    companyId: string,
    conversationId: string,
    limit: number,
  ): Promise<MessageEntity[]> {
    return this.store.messages
      .filter(
        (message) => message.companyId === companyId && message.conversationId === conversationId,
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .slice(-limit)
      .map(clone);
  }

  async countAll(companyId: string, since?: Date): Promise<number> {
    return this.store.conversations.filter(
      (c) => c.companyId === companyId && (!since || c.createdAt.getTime() >= since.getTime()),
    ).length;
  }

  async countByStatus(companyId: string, status: ConversationStatus): Promise<number> {
    return this.store.conversations.filter((c) => c.companyId === companyId && c.status === status)
      .length;
  }

  async countMessages(
    companyId: string,
    since?: Date,
  ): Promise<{ total: number; assistant: number }> {
    const items = this.store.messages.filter(
      (m) => m.companyId === companyId && (!since || m.createdAt.getTime() >= since.getTime()),
    );
    return {
      total: items.length,
      assistant: items.filter((m) => m.role === MessageRole.ASSISTANT).length,
    };
  }

  async listCreatedSince(companyId: string, since: Date): Promise<ConversationEntity[]> {
    return this.store.conversations
      .filter((c) => c.companyId === companyId && c.createdAt.getTime() >= since.getTime())
      .map(clone);
  }
}

class FakeLeadsRepository implements LeadsRepository {
  constructor(private readonly store: FakeStore) {}

  async list(companyId: string, filter: LeadFilter, page: PageQuery): Promise<Paged<LeadEntity>> {
    let items = this.store.leads.filter((lead) => lead.companyId === companyId);
    if (filter.status) items = items.filter((lead) => lead.status === filter.status);
    if (filter.assignedManagerId) {
      items = items.filter((lead) => lead.assignedManagerId === filter.assignedManagerId);
    }

    const from = filter.from;
    if (from) items = items.filter((lead) => lead.createdAt.getTime() >= from.getTime());
    const to = filter.to;
    if (to) items = items.filter((lead) => lead.createdAt.getTime() <= to.getTime());

    if (filter.search) {
      const search = filter.search.toLowerCase();
      items = items.filter((lead) =>
        [lead.name ?? "", lead.phone ?? "", lead.interest ?? ""].some((field) =>
          field.toLowerCase().includes(search),
        ),
      );
    }
    items = [...items].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    return paginate(items, page);
  }

  async findById(companyId: string, leadId: string): Promise<LeadEntity | null> {
    const found = this.store.leads.find(
      (lead) => lead.id === leadId && lead.companyId === companyId,
    );
    return found ? clone(found) : null;
  }

  async findOpenByConversation(
    companyId: string,
    conversationId: string,
  ): Promise<LeadEntity | null> {
    const found = this.store.leads.find(
      (lead) =>
        lead.companyId === companyId &&
        lead.conversationId === conversationId &&
        lead.status !== LeadStatus.WON &&
        lead.status !== LeadStatus.LOST,
    );
    return found ? clone(found) : null;
  }

  async create(companyId: string, input: LeadWriteInput): Promise<LeadEntity> {
    const at = this.store.now();
    const lead: LeadEntity = {
      id: this.store.id("led"),
      companyId,
      customerId: input.customerId,
      conversationId: input.conversationId,
      name: input.name,
      phone: input.phone,
      telegramUserId: input.telegramUserId,
      source: input.source,
      interest: input.interest,
      budgetMin: input.budgetMin,
      budgetMax: input.budgetMax,
      currency: input.currency,
      status: input.status,
      aiSummary: input.aiSummary,
      qualificationScore: input.qualificationScore,
      interestedProductIds: input.interestedProductIds,
      assignedManagerId: input.assignedManagerId,
      createdAt: at,
      updatedAt: at,
      contactedAt: null,
      closedAt: null,
    };
    this.store.leads.push(lead);
    return clone(lead);
  }

  async update(
    companyId: string,
    leadId: string,
    data: Partial<LeadWriteInput> & { contactedAt?: Date | null; closedAt?: Date | null },
  ): Promise<LeadEntity | null> {
    const lead = this.store.leads.find(
      (entry) => entry.id === leadId && entry.companyId === companyId,
    );
    if (!lead) return null;
    Object.assign(lead, data, { updatedAt: this.store.now() });
    return clone(lead);
  }

  async addEvent(
    companyId: string,
    input: {
      leadId: string;
      type: LeadEventEntity["type"];
      fromStatus: LeadEventEntity["fromStatus"];
      toStatus: LeadEventEntity["toStatus"];
      comment: string | null;
      actorUserId: string | null;
    },
  ): Promise<LeadEventEntity> {
    const event: LeadEventEntity = {
      id: this.store.id("lev"),
      companyId,
      ...input,
      createdAt: this.store.now(),
    };
    this.store.leadEvents.push(event);
    return clone(event);
  }

  async listEvents(companyId: string, leadId: string): Promise<LeadEventEntity[]> {
    return this.store.leadEvents
      .filter((event) => event.companyId === companyId && event.leadId === leadId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map(clone);
  }

  async countByStatus(companyId: string, since?: Date): Promise<Record<LeadStatus, number>> {
    const result: Record<LeadStatus, number> = {
      NEW: 0,
      QUALIFIED: 0,
      CONTACTED: 0,
      WON: 0,
      LOST: 0,
    };
    for (const lead of this.store.leads) {
      if (lead.companyId !== companyId) continue;
      if (since && lead.createdAt.getTime() < since.getTime()) continue;
      result[lead.status] += 1;
    }
    return result;
  }

  async listCreatedSince(companyId: string, since: Date): Promise<LeadEntity[]> {
    return this.store.leads
      .filter((lead) => lead.companyId === companyId && lead.createdAt.getTime() >= since.getTime())
      .map(clone);
  }
}

export function createFakeRepositories(store: FakeStore): Repositories {
  return {
    companies: new FakeCompaniesRepository(store),
    users: new FakeUsersRepository(store),
    sessions: new FakeSessionsRepository(store),
    products: new FakeProductsRepository(store),
    knowledge: new FakeKnowledgeRepository(store),
    channels: new FakeChannelsRepository(store),
    customers: new FakeCustomersRepository(store),
    conversations: new FakeConversationsRepository(store),
    leads: new FakeLeadsRepository(store),
  };
}