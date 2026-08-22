import { describe, expect, it } from "vitest";
import { LeadStatus, canTransitionLead } from "@ai-sales/shared";
import {
  QUALIFICATION_THRESHOLD,
  calculateQualificationScore,
  deriveAutoStatus,
  isQualified,
  type ScorableLead,
} from "../../src/modules/leads/leads.scoring.js";

const empty: ScorableLead = {
  name: null,
  phone: null,
  interest: null,
  budgetMin: null,
  budgetMax: null,
  interestedProductIds: [],
};

describe("скоринг лида", () => {
  it("пустой лид не набирает баллов", () => {
    expect(calculateQualificationScore(empty)).toBe(0);
  });

  it("телефон даёт наибольший вес", () => {
    expect(calculateQualificationScore({ ...empty, phone: "+998901234567" })).toBe(40);
  });

  it("суммирует признаки", () => {
    const lead: ScorableLead = {
      name: "Дилшод",
      phone: "+998901234567",
      interest: "Угловой диван до 8 млн",
      budgetMin: null,
      budgetMax: 8_000_000,
      interestedProductIds: ["prd_1"],
    };
    expect(calculateQualificationScore(lead)).toBe(100);
  });

  it("квалифицирует только при наличии контакта и интереса", () => {
    expect(isQualified({ ...empty, phone: "+998901234567" })).toBe(false);
    expect(isQualified({ ...empty, interest: "диван" })).toBe(false);

    const qualified = { ...empty, phone: "+998901234567", interest: "диван" };
    expect(calculateQualificationScore(qualified)).toBeGreaterThanOrEqual(QUALIFICATION_THRESHOLD);
    expect(isQualified(qualified)).toBe(true);
  });

  it("пустые строки не считаются заполненными полями", () => {
    expect(isQualified({ ...empty, phone: "   ", interest: "   " })).toBe(false);
  });

  it("автоматика не перезаписывает ручные статусы", () => {
    const qualified = { ...empty, phone: "+998901234567", interest: "диван" };
    expect(deriveAutoStatus(qualified, LeadStatus.NEW)).toBe(LeadStatus.QUALIFIED);
    expect(deriveAutoStatus(qualified, LeadStatus.CONTACTED)).toBe(LeadStatus.CONTACTED);
    expect(deriveAutoStatus(qualified, LeadStatus.WON)).toBe(LeadStatus.WON);
    expect(deriveAutoStatus(empty, LeadStatus.QUALIFIED)).toBe(LeadStatus.NEW);
  });
});

describe("переходы статусов", () => {
  it("разрешает движение по воронке", () => {
    expect(canTransitionLead(LeadStatus.NEW, LeadStatus.QUALIFIED)).toBe(true);
    expect(canTransitionLead(LeadStatus.QUALIFIED, LeadStatus.CONTACTED)).toBe(true);
    expect(canTransitionLead(LeadStatus.CONTACTED, LeadStatus.WON)).toBe(true);
  });

  it("запрещает выход из терминальных статусов", () => {
    expect(canTransitionLead(LeadStatus.WON, LeadStatus.CONTACTED)).toBe(false);
    expect(canTransitionLead(LeadStatus.LOST, LeadStatus.NEW)).toBe(false);
  });

  it("запрещает переход в тот же статус и прыжок NEW → WON", () => {
    expect(canTransitionLead(LeadStatus.NEW, LeadStatus.NEW)).toBe(false);
    expect(canTransitionLead(LeadStatus.NEW, LeadStatus.WON)).toBe(false);
  });
});