import { z } from "zod";
import { Language } from "@ai-sales/shared";

export const updateCompanySchema = z
  .object({
    name: z.string().trim().min(2).max(200).optional(),
    phone: z.string().trim().max(30).nullable().optional(),
    defaultLanguage: z.nativeEnum(Language).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нечего обновлять");

const knowledgeField = z.string().trim().max(4000).nullable().default(null);

export const updateKnowledgeSchema = z
  .object({
    about: knowledgeField,
    address: knowledgeField,
    workingHours: knowledgeField,
    delivery: knowledgeField,
    payment: knowledgeField,
    warranty: knowledgeField,
    managerInstructions: knowledgeField,
  })
  .strict();

export const createFaqSchema = z
  .object({
    question: z.string().trim().min(3, "Слишком короткий вопрос").max(500),
    answer: z.string().trim().min(1, "Ответ обязателен").max(2000),
    position: z.number().int().min(0).max(1000).default(0),
    active: z.boolean().default(true),
  })
  .strict();

export const updateFaqSchema = createFaqSchema
  .partial()
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нечего обновлять");

export const faqIdSchema = z.object({ id: z.string().min(1) });

export const updateAiSettingsSchema = z
  .object({
    enabled: z.boolean().optional(),
    assistantName: z.string().trim().min(1).max(100).optional(),
    tone: z.string().trim().min(1).max(300).optional(),
    greeting: z.string().trim().max(1000).nullable().optional(),
    systemInstructions: z.string().trim().max(4000).nullable().optional(),
    autoCreateLead: z.boolean().optional(),
    model: z.string().trim().min(3).max(100).optional(),
    temperature: z.number().min(0).max(1).optional(),
    maxTokens: z.number().int().min(256).max(8192).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нечего обновлять");

export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>;
export type UpdateKnowledgeInput = z.infer<typeof updateKnowledgeSchema>;
export type CreateFaqInput = z.infer<typeof createFaqSchema>;
export type UpdateFaqInput = z.infer<typeof updateFaqSchema>;
export type UpdateAiSettingsInput = z.infer<typeof updateAiSettingsSchema>;