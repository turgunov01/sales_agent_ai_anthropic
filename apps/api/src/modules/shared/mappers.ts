import type {
  AiSettingsDto,
  ChannelDto,
  CompanyDto,
  ConversationDto,
  CustomerDto,
  FaqItemDto,
  KnowledgeBaseDto,
  LeadDto,
  LeadEventDto,
  MessageDto,
  ProductDto,
  UserDto,
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
  UserEntity,
} from "../../domain/entities.js";

const iso = (value: Date | null): string | null => (value ? value.toISOString() : null);

export const toCompanyDto = (entity: CompanyEntity): CompanyDto => ({
  id: entity.id,
  name: entity.name,
  slug: entity.slug,
  phone: entity.phone,
  status: entity.status,
  defaultLanguage: entity.defaultLanguage,
  createdAt: entity.createdAt.toISOString(),
});

/** passwordHash не покидает сервер ни при каких условиях. */
export const toUserDto = (entity: UserEntity): UserDto => ({
  id: entity.id,
  companyId: entity.companyId,
  email: entity.email,
  fullName: entity.fullName,
  role: entity.role,
  isActive: entity.isActive,
  lastLoginAt: iso(entity.lastLoginAt),
  createdAt: entity.createdAt.toISOString(),
});

export const toProductDto = (entity: ProductEntity): ProductDto => ({
  id: entity.id,
  companyId: entity.companyId,
  externalId: entity.externalId,
  name: entity.name,
  description: entity.description,
  category: entity.category,
  price: entity.price,
  currency: entity.currency,
  images: entity.images,
  attributes: entity.attributes,
  stockStatus: entity.stockStatus,
  active: entity.active,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
});

export const toKnowledgeDto = (entity: KnowledgeBaseEntity | null): KnowledgeBaseDto => ({
  about: entity?.about ?? null,
  address: entity?.address ?? null,
  workingHours: entity?.workingHours ?? null,
  delivery: entity?.delivery ?? null,
  payment: entity?.payment ?? null,
  warranty: entity?.warranty ?? null,
  managerInstructions: entity?.managerInstructions ?? null,
  updatedAt: entity?.updatedAt ? entity.updatedAt.toISOString() : null,
});

export const toFaqDto = (entity: FaqItemEntity): FaqItemDto => ({
  id: entity.id,
  question: entity.question,
  answer: entity.answer,
  position: entity.position,
  active: entity.active,
});

export const toAiSettingsDto = (entity: AiSettingsEntity): AiSettingsDto => ({
  enabled: entity.enabled,
  assistantName: entity.assistantName,
  tone: entity.tone,
  greeting: entity.greeting,
  systemInstructions: entity.systemInstructions,
  autoCreateLead: entity.autoCreateLead,
  model: entity.model,
  temperature: entity.temperature,
  maxTokens: entity.maxTokens,
});

export const toChannelDto = (
  entity: ChannelEntity,
  maskedToken: string,
  webhookUrl: string,
): ChannelDto => ({
  id: entity.id,
  type: entity.type,
  isActive: entity.isActive,
  botUsername: entity.botUsername,
  maskedToken,
  lastConnectedAt: iso(entity.lastConnectedAt),
  webhookUrl,
});

export const toCustomerDto = (entity: CustomerEntity): CustomerDto => ({
  id: entity.id,
  externalId: entity.externalId,
  firstName: entity.firstName,
  lastName: entity.lastName,
  username: entity.username,
  phone: entity.phone,
  language: entity.language,
  createdAt: entity.createdAt.toISOString(),
});

export const toConversationDto = (
  entity: ConversationEntity,
  customer: CustomerEntity,
  extras: { lastMessagePreview?: string } = {},
): ConversationDto => ({
  id: entity.id,
  status: entity.status,
  language: entity.language,
  assignedUserId: entity.assignedUserId,
  handoffReason: entity.handoffReason,
  lastMessageAt: entity.lastMessageAt.toISOString(),
  createdAt: entity.createdAt.toISOString(),
  customer: toCustomerDto(customer),
  ...(extras.lastMessagePreview !== undefined
    ? { lastMessagePreview: extras.lastMessagePreview }
    : {}),
});

export const toMessageDto = (entity: MessageEntity): MessageDto => ({
  id: entity.id,
  conversationId: entity.conversationId,
  role: entity.role,
  type: entity.type,
  content: entity.content,
  createdAt: entity.createdAt.toISOString(),
});

export const toLeadDto = (entity: LeadEntity): LeadDto => ({
  id: entity.id,
  customerId: entity.customerId,
  conversationId: entity.conversationId,
  name: entity.name,
  phone: entity.phone,
  telegramUserId: entity.telegramUserId,
  source: entity.source,
  interest: entity.interest,
  budgetMin: entity.budgetMin,
  budgetMax: entity.budgetMax,
  currency: entity.currency,
  status: entity.status,
  aiSummary: entity.aiSummary,
  qualificationScore: entity.qualificationScore,
  interestedProductIds: entity.interestedProductIds,
  assignedManagerId: entity.assignedManagerId,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString(),
  contactedAt: iso(entity.contactedAt),
  closedAt: iso(entity.closedAt),
});

export const toLeadEventDto = (entity: LeadEventEntity): LeadEventDto => ({
  id: entity.id,
  type: entity.type,
  fromStatus: entity.fromStatus,
  toStatus: entity.toStatus,
  comment: entity.comment,
  actorUserId: entity.actorUserId,
  createdAt: entity.createdAt.toISOString(),
});