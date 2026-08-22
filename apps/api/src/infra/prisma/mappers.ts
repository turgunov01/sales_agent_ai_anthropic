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
} from "../../domain/entities.js";
import { toNullableNumber, toNumber } from "../../core/utils/numbers.js";

type Row = Record<string, unknown>;

/** Ключи, которые нельзя записывать в объект: изменяют прототип, а не данные. */
const FORBIDDEN_ATTRIBUTE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function isSafeAttributeKey(key: string): boolean {
  return key.length > 0 && !FORBIDDEN_ATTRIBUTE_KEYS.has(key);
}

export function toProductAttributes(value: unknown): ProductAttributes {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return {};
  const result: ProductAttributes = Object.create(null) as ProductAttributes;
  for (const [key, raw] of Object.entries(value as Row)) {
    if (!isSafeAttributeKey(key)) continue;
    if (typeof raw === "string" || typeof raw === "number" || typeof raw === "boolean") {
      result[key] = raw;
    }
  }
  return { ...result };
}

export const mapCompany = (row: Row): CompanyEntity => ({
  id: row.id as string,
  name: row.name as string,
  slug: row.slug as string,
  phone: (row.phone as string | null) ?? null,
  status: row.status as CompanyEntity["status"],
  defaultLanguage: row.defaultLanguage as CompanyEntity["defaultLanguage"],
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
});

export const mapUser = (row: Row): UserEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  email: row.email as string,
  passwordHash: row.passwordHash as string,
  fullName: row.fullName as string,
  role: row.role as UserEntity["role"],
  isActive: row.isActive as boolean,
  lastLoginAt: (row.lastLoginAt as Date | null) ?? null,
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
});

export const mapSession = (row: Row): SessionEntity => ({
  id: row.id as string,
  userId: row.userId as string,
  refreshTokenHash: row.refreshTokenHash as string,
  userAgent: (row.userAgent as string | null) ?? null,
  ip: (row.ip as string | null) ?? null,
  expiresAt: row.expiresAt as Date,
  revokedAt: (row.revokedAt as Date | null) ?? null,
  createdAt: row.createdAt as Date,
});

export const mapProduct = (row: Row): ProductEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  externalId: (row.externalId as string | null) ?? null,
  name: row.name as string,
  description: (row.description as string | null) ?? null,
  category: (row.category as string | null) ?? null,
  price: toNumber(row.price),
  currency: row.currency as ProductEntity["currency"],
  images: (row.images as string[] | null) ?? [],
  attributes: toProductAttributes(row.attributes),
  stockStatus: row.stockStatus as ProductEntity["stockStatus"],
  active: row.active as boolean,
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
});

export const mapKnowledge = (row: Row): KnowledgeBaseEntity => ({
  companyId: row.companyId as string,
  about: (row.about as string | null) ?? null,
  address: (row.address as string | null) ?? null,
  workingHours: (row.workingHours as string | null) ?? null,
  delivery: (row.delivery as string | null) ?? null,
  payment: (row.payment as string | null) ?? null,
  warranty: (row.warranty as string | null) ?? null,
  managerInstructions: (row.managerInstructions as string | null) ?? null,
  updatedAt: (row.updatedAt as Date | null) ?? null,
});

export const mapFaq = (row: Row): FaqItemEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  question: row.question as string,
  answer: row.answer as string,
  position: row.position as number,
  active: row.active as boolean,
});

export const mapAiSettings = (row: Row): AiSettingsEntity => ({
  companyId: row.companyId as string,
  enabled: row.enabled as boolean,
  assistantName: row.assistantName as string,
  tone: row.tone as string,
  greeting: (row.greeting as string | null) ?? null,
  systemInstructions: (row.systemInstructions as string | null) ?? null,
  autoCreateLead: row.autoCreateLead as boolean,
  model: row.model as string,
  temperature: toNumber(row.temperature),
  maxTokens: row.maxTokens as number,
});

export const mapChannel = (row: Row): ChannelEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  type: row.type as ChannelEntity["type"],
  isActive: row.isActive as boolean,
  botUsername: (row.botUsername as string | null) ?? null,
  botExternalId: (row.botExternalId as string | null) ?? null,
  botTokenCiphertext: row.botTokenCiphertext as string,
  webhookSecret: row.webhookSecret as string,
  lastConnectedAt: (row.lastConnectedAt as Date | null) ?? null,
  createdAt: row.createdAt as Date,
});

export const mapCustomer = (row: Row): CustomerEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  channelType: row.channelType as CustomerEntity["channelType"],
  externalId: row.externalId as string,
  firstName: (row.firstName as string | null) ?? null,
  lastName: (row.lastName as string | null) ?? null,
  username: (row.username as string | null) ?? null,
  phone: (row.phone as string | null) ?? null,
  language: row.language as CustomerEntity["language"],
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
});

export const mapConversation = (row: Row): ConversationEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  customerId: row.customerId as string,
  channelId: row.channelId as string,
  status: row.status as ConversationEntity["status"],
  language: row.language as ConversationEntity["language"],
  assignedUserId: (row.assignedUserId as string | null) ?? null,
  handoffReason: (row.handoffReason as string | null) ?? null,
  lastMessageAt: row.lastMessageAt as Date,
  createdAt: row.createdAt as Date,
  closedAt: (row.closedAt as Date | null) ?? null,
});

export const mapMessage = (row: Row): MessageEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  conversationId: row.conversationId as string,
  role: row.role as MessageEntity["role"],
  type: row.type as MessageEntity["type"],
  content: row.content as string,
  attachments: row.attachments ?? null,
  toolCalls: row.toolCalls ?? null,
  tokensIn: (row.tokensIn as number | null) ?? null,
  tokensOut: (row.tokensOut as number | null) ?? null,
  createdAt: row.createdAt as Date,
});

export const mapLead = (row: Row): LeadEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  customerId: row.customerId as string,
  conversationId: (row.conversationId as string | null) ?? null,
  name: (row.name as string | null) ?? null,
  phone: (row.phone as string | null) ?? null,
  telegramUserId: (row.telegramUserId as string | null) ?? null,
  source: row.source as LeadEntity["source"],
  interest: (row.interest as string | null) ?? null,
  budgetMin: toNullableNumber(row.budgetMin),
  budgetMax: toNullableNumber(row.budgetMax),
  currency: row.currency as LeadEntity["currency"],
  status: row.status as LeadEntity["status"],
  aiSummary: (row.aiSummary as string | null) ?? null,
  qualificationScore: row.qualificationScore as number,
  interestedProductIds: (row.interestedProductIds as string[] | null) ?? [],
  assignedManagerId: (row.assignedManagerId as string | null) ?? null,
  createdAt: row.createdAt as Date,
  updatedAt: row.updatedAt as Date,
  contactedAt: (row.contactedAt as Date | null) ?? null,
  closedAt: (row.closedAt as Date | null) ?? null,
});

export const mapLeadEvent = (row: Row): LeadEventEntity => ({
  id: row.id as string,
  companyId: row.companyId as string,
  leadId: row.leadId as string,
  type: row.type as LeadEventEntity["type"],
  fromStatus: (row.fromStatus as LeadEventEntity["fromStatus"]) ?? null,
  toStatus: (row.toStatus as LeadEventEntity["toStatus"]) ?? null,
  comment: (row.comment as string | null) ?? null,
  actorUserId: (row.actorUserId as string | null) ?? null,
  createdAt: row.createdAt as Date,
});