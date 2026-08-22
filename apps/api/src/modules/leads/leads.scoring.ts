import { LeadStatus } from "@ai-sales/shared";

export interface ScorableLead {
  name: string | null;
  phone: string | null;
  interest: string | null;
  budgetMin: number | null;
  budgetMax: number | null;
  interestedProductIds: string[];
}

export const SCORE_WEIGHTS = {
  phone: 40,
  name: 10,
  interest: 20,
  budget: 15,
  products: 15,
} as const;

/** Порог, с которого лид считается квалифицированным. */
export const QUALIFICATION_THRESHOLD = 60;

/**
 * Скоринг детерминирован и считается кодом, а не моделью:
 * «квалифицированный лид» должен быть проверяемым фактом.
 */
export function calculateQualificationScore(lead: ScorableLead): number {
  let score = 0;
  if (lead.phone && lead.phone.trim().length > 0) score += SCORE_WEIGHTS.phone;
  if (lead.name && lead.name.trim().length > 0) score += SCORE_WEIGHTS.name;
  if (lead.interest && lead.interest.trim().length > 0) score += SCORE_WEIGHTS.interest;
  if (lead.budgetMin !== null || lead.budgetMax !== null) score += SCORE_WEIGHTS.budget;
  if (lead.interestedProductIds.length > 0) score += SCORE_WEIGHTS.products;
  return score;
}

export function isQualified(lead: ScorableLead): boolean {
  const hasContact = Boolean(lead.phone && lead.phone.trim().length > 0);
  const hasInterest = Boolean(lead.interest && lead.interest.trim().length > 0);
  return hasContact && hasInterest && calculateQualificationScore(lead) >= QUALIFICATION_THRESHOLD;
}

/**
 * Статус, который автоматика вправе выставить. Ручные статусы
 * (CONTACTED, WON, LOST) никогда не перезаписываются автоматикой.
 */
export function deriveAutoStatus(lead: ScorableLead, current: LeadStatus): LeadStatus {
  if (current !== LeadStatus.NEW && current !== LeadStatus.QUALIFIED) return current;
  return isQualified(lead) ? LeadStatus.QUALIFIED : LeadStatus.NEW;
}