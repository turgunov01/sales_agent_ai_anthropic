import { z } from "zod";
import { ConversationStatus } from "@ai-sales/shared";

export const conversationIdSchema = z.object({ id: z.string().min(1) });

export const listConversationsQuerySchema = z.object({
  status: z.nativeEnum(ConversationStatus).optional(),
  assignedUserId: z.string().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const listMessagesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
});

export const sendMessageSchema = z
  .object({
    text: z.string().trim().min(1, "Сообщение пустое").max(4096),
  })
  .strict();

export const handoffSchema = z
  .object({
    reason: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export type ListConversationsQuery = z.infer<typeof listConversationsQuerySchema>;
export type SendMessageInput = z.infer<typeof sendMessageSchema>;