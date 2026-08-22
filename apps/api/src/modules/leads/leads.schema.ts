import { z } from "zod";
import { Currency, LeadStatus } from "@ai-sales/shared";

const MAX_BUDGET = 1_000_000_000_000;

export const leadIdSchema = z.object({ id: z.string().min(1) });

export const listLeadsQuerySchema = z.object({
  status: z.nativeEnum(LeadStatus).optional(),
  assignedManagerId: z.string().min(1).optional(),
  q: z.string().trim().max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const createLeadSchema = z
  .object({
    customerId: z.string().min(1, "Укажите клиента"),
    conversationId: z.string().min(1).nullable().default(null),
    name: z.string().trim().max(200).nullable().default(null),
    phone: z.string().trim().max(30).nullable().default(null),
    interest: z.string().trim().max(1000).nullable().default(null),
    budgetMin: z.number().min(0).max(MAX_BUDGET).nullable().default(null),
    budgetMax: z.number().min(0).max(MAX_BUDGET).nullable().default(null),
    currency: z.nativeEnum(Currency).default(Currency.UZS),
    interestedProductIds: z.array(z.string().min(1)).max(20).default([]),
    assignedManagerId: z.string().min(1).nullable().default(null),
    aiSummary: z.string().trim().max(2000).nullable().default(null),
  })
  .strict();

export const updateLeadSchema = z
  .object({
    name: z.string().trim().max(200).nullable().optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    interest: z.string().trim().max(1000).nullable().optional(),
    budgetMin: z.number().min(0).max(MAX_BUDGET).nullable().optional(),
    budgetMax: z.number().min(0).max(MAX_BUDGET).nullable().optional(),
    currency: z.nativeEnum(Currency).optional(),
    interestedProductIds: z.array(z.string().min(1)).max(20).optional(),
    aiSummary: z.string().trim().max(2000).nullable().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нечего обновлять");

export const changeStatusSchema = z
  .object({
    status: z.nativeEnum(LeadStatus),
    comment: z.string().trim().max(1000).nullable().default(null),
  })
  .strict();

export const assignLeadSchema = z
  .object({
    managerId: z.string().min(1).nullable(),
  })
  .strict();

export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;