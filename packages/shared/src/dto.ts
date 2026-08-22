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
} from "./enums.js";

export interface CompanyDto {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  status: CompanyStatus;
  defaultLanguage: Language;
  createdAt: string;
}

export interface UserDto {
  id: string;
  companyId: string;
  email: string;
  fullName: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResultDto {
  user: UserDto;
  company: CompanyDto;
  tokens: AuthTokensDto;
}

export interface ProductDto {
  id: string;
  companyId: string;
  externalId: string | null;
  name: string;
  description: string | null;
  category: string | null;
  price: number;
  currency: Currency;
  images: string[];
  attributes: Record<string, string | number | boolean>;
  stockStatus: StockStatus;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeBaseDto {
  about: string | null;
  address: string | null;
  workingHours: string | null;
  delivery: string | null;
  payment: string | null;
  warranty: string | null;
  managerInstructions: string | null;
  updatedAt: string | null;
}

export interface FaqItemDto {
  id: string;
  question: string;
  answer: string;
  position: number;
  active: boolean;
}

export interface AiSettingsDto {
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

export interface ChannelDto {
  id: string;
  type: ChannelType;
  isActive: boolean;
  botUsername: string | null;
  maskedToken: string;
  lastConnectedAt: string | null;
  webhookUrl: string;
}

export interface CustomerDto {
  id: string;
  externalId: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  phone: string | null;
  language: Language;
  createdAt: string;
}

export interface ConversationDto {
  id: string;
  status: ConversationStatus;
  language: Language;
  assignedUserId: string | null;
  handoffReason: string | null;
  lastMessageAt: string;
  createdAt: string;
  customer: CustomerDto;
  lastMessagePreview?: string;
  unreadForManager?: number;
}

export interface MessageDto {
  id: string;
  conversationId: string;
  role: MessageRole;
  type: MessageType;
  content: string;
  createdAt: string;
}

export interface LeadEventDto {
  id: string;
  type: LeadEventType;
  fromStatus: LeadStatus | null;
  toStatus: LeadStatus | null;
  comment: string | null;
  actorUserId: string | null;
  createdAt: string;
}

export interface LeadDto {
  id: string;
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
  createdAt: string;
  updatedAt: string;
  contactedAt: string | null;
  closedAt: string | null;
}

export interface LeadWithEventsDto extends LeadDto {
  events: LeadEventDto[];
  customer: CustomerDto | null;
}

export interface AnalyticsOverviewDto {
  leads: {
    total: number;
    byStatus: Record<LeadStatus, number>;
  };
  conversations: {
    total: number;
    active: number;
    handoffRequested: number;
  };
  messages: {
    total: number;
    byAssistant: number;
  };
  products: {
    total: number;
    active: number;
  };
  conversionRate: number;
  daily: Array<{ date: string; leads: number; conversations: number }>;
}

// ───────────────────── Платформа (оператор SaaS) ─────────────────────────────

export interface PlatformAdminDto {
  id: string;
  email: string;
  fullName: string;
  lastLoginAt: string | null;
}

export interface CompanySummaryDto {
  id: string;
  name: string;
  slug: string;
  phone: string | null;
  status: CompanyStatus;
  defaultLanguage: Language;
  createdAt: string;
  users: number;
  products: number;
  conversations: number;
  leads: number;
  qualifiedLeads: number;
  channelConnected: boolean;
  lastActivityAt: string | null;
}

export interface CompanyDetailDto extends CompanySummaryDto {
  staff: UserDto[];
}

export interface PlatformAuditDto {
  id: string;
  adminEmail: string | null;
  action: string;
  companyId: string | null;
  createdAt: string;
}