import type { Language, LeadStatus } from "@ai-sales/shared";

export interface AgentContext {
  companyId: string;
  conversationId: string;
  customerId: string;
  customerExternalId: string;
  customerName: string | null;
  customerPhone: string | null;
  language: Language;
}

export type AgentEffect =
  | { type: "SHOW_PRODUCTS"; productIds: string[] }
  | { type: "REQUEST_CONTACT"; reason: string }
  | { type: "TRANSFER_TO_MANAGER"; reason: string; urgency: "low" | "normal" | "high" }
  | { type: "LEAD_UPSERTED"; leadId: string; status: LeadStatus };

export interface AgentToolCall {
  name: string;
  input: Record<string, unknown>;
  ok: boolean;
}

export interface AgentResult {
  text: string;
  effects: AgentEffect[];
  toolCalls: AgentToolCall[];
  usage: { inputTokens: number; outputTokens: number };
  degraded: boolean;
}