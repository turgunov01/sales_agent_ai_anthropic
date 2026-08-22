import { z } from "zod";

/** Минимальная схема апдейта Telegram: берём только то, что реально используем. */
export const telegramUserSchema = z.object({
  id: z.number(),
  is_bot: z.boolean().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

export const telegramChatSchema = z.object({
  id: z.number(),
  type: z.string().optional(),
});

export const telegramContactSchema = z.object({
  phone_number: z.string(),
  first_name: z.string().optional(),
  user_id: z.number().optional(),
});

export const telegramPhotoSchema = z.object({
  file_id: z.string(),
  file_unique_id: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
});

export const telegramVoiceSchema = z.object({
  file_id: z.string(),
  duration: z.number().optional(),
});

export const telegramMessageSchema = z.object({
  message_id: z.number(),
  from: telegramUserSchema.optional(),
  chat: telegramChatSchema,
  date: z.number().optional(),
  text: z.string().optional(),
  caption: z.string().optional(),
  contact: telegramContactSchema.optional(),
  photo: z.array(telegramPhotoSchema).optional(),
  voice: telegramVoiceSchema.optional(),
  document: z.object({ file_id: z.string(), file_name: z.string().optional() }).optional(),
});

export const telegramUpdateSchema = z.object({
  update_id: z.number(),
  message: telegramMessageSchema.optional(),
  edited_message: telegramMessageSchema.optional(),
});

export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;

export interface SendMessageParams {
  chatId: string;
  text: string;
  requestContactButton?: { label: string } | undefined;
  removeKeyboard?: boolean;
}

export interface SendPhotoParams {
  chatId: string;
  photoUrl: string;
  caption: string;
}

export interface BotIdentity {
  id: number;
  username: string | null;
}

/** Порт Telegram Bot API. Тесты подставляют фейк и проверяют исходящие вызовы. */
export interface TelegramTransport {
  getMe(botToken: string): Promise<BotIdentity>;
  setWebhook(botToken: string, url: string, secret: string): Promise<void>;
  deleteWebhook(botToken: string): Promise<void>;
  sendMessage(botToken: string, params: SendMessageParams): Promise<void>;
  sendPhoto(botToken: string, params: SendPhotoParams): Promise<void>;
}