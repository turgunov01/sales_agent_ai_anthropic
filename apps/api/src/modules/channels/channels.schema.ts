import { z } from "zod";

export const connectTelegramSchema = z
  .object({
    botToken: z
      .string()
      .trim()
      .regex(/^\d{6,12}:[A-Za-z0-9_-]{30,}$/, "Некорректный формат токена бота"),
  })
  .strict();

export const channelIdSchema = z.object({ id: z.string().min(1) });

export type ConnectTelegramInput = z.infer<typeof connectTelegramSchema>;