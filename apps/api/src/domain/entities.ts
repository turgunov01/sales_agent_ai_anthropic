import type {
  ChannelType,
  CompanyStatus,
  ConversationStatus,
  Currency,
  Language,
  LeadEventType,
  LeadSource,
  LeadStatus,
  MessageRole,
  MessageType,
  StockStatus,
  UserRole,
} from "@ai-sales/shared";

/**
 * Доменные сущности. Отличаются от DTO наличием секретов и типом Date,
 * и от моделей Prisma — отсутствием Decimal и связей.
 * Репозитории принимают и возвращают именно эти типы, поэтому подмена
 * Prisma-реализации на тестовую не меняет ни один сервис.
 */

export type ProductAttributes = Record<string, string | number | boolean>;

export interface CompanyEntity {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  status: CompanyStatus;
  defaultLanguage: Language;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserEntity {
  id: string;
  companyId: string;
  email: string;
  passwordHash: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionEntity {
  id: string;
  userId: string;
  refreshTokenHash: string;
  userAgent: string | null;
  ip: string | null;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export interface ProductEntity {
  id: string;
  companyId: string;
  externalId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  currency: Currency;
  images: string[];
  attributes: ProductAttributes;
  stockStatus: StockStatus;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeBaseEntity {
  companyId: string;
  about: string | null;
  address: string | null;
  workingHours: string | null;
  delivery: string | null;
  payment: string | null;
  warranty: string | null;
  managerInstructions: string | null;
  updatedAt: Date | null;
}

export interface FaqItemEntity {
  id: string;
  companyId: string;
  question: string;
  answer: string;
  position: number;
  active: boolean;
}

export interface AiSettingsEntity {
  companyId: string;
  enabled: boolean;
  assistantName: string;
  tone: string;
  greeting: string | null;
  systemInstructions: string | null;
  autoCreateLead: boolean;
  model: string;
  temperature: number;
  maxTokens: number;
}

export interface ChannelEntity {
  id: string;
  companyId: string;
  type: ChannelType;
  isActive: boolean;
  botUsername: string | null;
  botExternalId: string | null;
  botTokenCiphertext: string;
  webhookSecret: string;
  lastConnectedAt: Date | null;
  createdAt: Date;
}

export interface CustomerEntity {
  id: string;
  companyId: string;
  channelType: ChannelType;
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  language: Language;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationEntity {
  id: string;
  companyId: string;
  customerId: string;
  channelId: string;
  status: ConversationStatus;
  language: Language;
  assignedUserId: string | null;
  handoffReason: string | null;
  lastMessageAt: Date;
  createdAt: Date;
  closedAt: Date | null;
}

export interface MessageEntity {
  id: string;
  companyId: string;
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  attachments: unknown;
  toolCalls: unknown;
  tokensIn: number | null;
  tokensOut: number | null;
  createdAt: Date;
}

export interface LeadEntity {
  id: string;
  companyId: string;
  customerId: string;
  conversationId: string | null;
  name: string | null;
  phone: string | null;
  telegramUserId: string | null;
  source: LeadSource;
  interest: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  currency: Currency;
  status: LeadStatus;
  aiSummary: string | null;
  qualificationScore: number;
  interestedProductIds: string[];
  assignedManagerId: string | null;
  createdAt: Date;
  updatedAt: Date;
  contactedAt: Date | null;
  closedAt: Date | null;
}

export interface LeadEventEntity {
  id: string;
  companyId: string;
  leadId: string;
  type: LeadEventType;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  comment: string | null;
  actorUserId: string | null;
  createdAt: Date;
}