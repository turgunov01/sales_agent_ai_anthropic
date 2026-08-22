import { z } from "zod";
import { Language } from "@ai-sales/shared";

const password = z
  .string()
  .min(8, "Пароль должен быть не короче 8 символов")
  .max(128)
  .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать букву")
  .regex(/\d/, "Пароль должен содержать цифру");

const email = z.string().trim().toLowerCase().email("Некорректный email").max(200);

export const registerSchema = z
  .object({
    companyName: z.string().trim().min(2, "Название компании слишком короткое").max(200),
    fullName: z.string().trim().min(2, "Укажите имя").max(200),
    email,
    password,
    phone: z.string().trim().max(30).optional(),
    defaultLanguage: z.nativeEnum(Language).default(Language.RU),
  })
  .strict();

export const loginSchema = z
  .object({
    email,
    password: z.string().min(1, "Введите пароль").max(128),
  })
  .strict();

export const refreshSchema = z
  .object({
    refreshToken: z.string().min(10, "Некорректный refresh-токен").max(500),
  })
  .strict();

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;