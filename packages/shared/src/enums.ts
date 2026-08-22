/**
 * Перечисления домена. Значения совпадают с enum'ами Prisma —
 * это единственный источник правды для фронтенда, который не тянет @prisma/client.
 */

export const UserRole = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CompanyStatus = {
  ACTIVE: "ACTIVE",
  SUSPENDED: "SUSPENDED",
} as const;
export type CompanyStatus = (typeof CompanyStatus)[keyof typeof CompanyStatus];

export const Language = {
  RU: "RU",
  UZ: "UZ",
} as const;
export type Language = (typeof Language)[keyof typeof Language];

export const Currency = {
  UZS: "UZS",
  USD: "USD",
} as const;
export type Currency = (typeof Currency)[keyof typeof Currency];

export const StockStatus = {
  IN_STOCK: "IN_STOCK",
  OUT_OF_STOCK: "OUT_OF_STOCK",
  ON_ORDER: "ON_ORDER",
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];

export const ChannelType = {
  TELEGRAM: "TELEGRAM",
} as const;
export type ChannelType = (typeof ChannelType)[keyof typeof ChannelType];

export const ConversationStatus = {
  ACTIVE: "ACTIVE",
  HANDOFF_REQUESTED: "HANDOFF_REQUESTED",
  HUMAN_HANDLING: "HUMAN_HANDLING",
  CLOSED: "CLOSED",
} as const;
export type ConversationStatus = (typeof ConversationStatus)[keyof typeof ConversationStatus];

export const MessageRole = {
  CUSTOMER: "CUSTOMER",
  ASSISTANT: "ASSISTANT",
  MANAGER: "MANAGER",
  SYSTEM: "SYSTEM",
} as const;
export type MessageRole = (typeof MessageRole)[keyof typeof MessageRole];

export const MessageType = {
  TEXT: "TEXT",
  PHOTO: "PHOTO",
  VOICE: "VOICE",
  DOCUMENT: "DOCUMENT",
  SYSTEM_EVENT: "SYSTEM_EVENT",
} as const;
export type MessageType = (typeof MessageType)[keyof typeof MessageType];

export const LeadStatus = {
  NEW: "NEW",
  QUALIFIED: "QUALIFIED",
  CONTACTED: "CONTACTED",
  WON: "WON",
  LOST: "LOST",
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const LeadSource = {
  TELEGRAM: "TELEGRAM",
  MANUAL: "MANUAL",
} as const;
export type LeadSource = (typeof LeadSource)[keyof typeof LeadSource];

export const LeadEventType = {
  CREATED: "CREATED",
  STATUS_CHANGED: "STATUS_CHANGED",
  CONTACT_CAPTURED: "CONTACT_CAPTURED",
  ASSIGNED: "ASSIGNED",
  NOTE_ADDED: "NOTE_ADDED",
  HANDOFF_REQUESTED: "HANDOFF_REQUESTED",
} as const;
export type LeadEventType = (typeof LeadEventType)[keyof typeof LeadEventType];

/**
 * Разрешённые переходы статусов лида. WON и LOST — терминальные.
 * Используется и на сервере (валидация), и в UI (какие кнопки показывать).
 */
export const LEAD_STATUS_TRANSITIONS: Record<LeadStatus, readonly LeadStatus[]> = {
  NEW: ["QUALIFIED", "CONTACTED", "LOST"],
  QUALIFIED: ["CONTACTED", "WON", "LOST"],
  CONTACTED: ["WON", "LOST", "QUALIFIED"],
  WON: [],
  LOST: [],
} as const;

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  return LEAD_STATUS_TRANSITIONS[from].includes(to);
}