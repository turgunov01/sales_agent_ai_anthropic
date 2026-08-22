import { z } from "zod";
import { CompanyStatus, Language } from "@ai-sales/shared";

const email = z.string().trim().toLowerCase().email("Некорректный email").max(200);

export const platformLoginSchema = z
  .object({ email, password: z.string().min(1).max(128) })
  .strict();

export const platformRefreshSchema = z
  .object({ refreshToken: z.string().min(10).max(500) })
  .strict();

export const listCompaniesQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  status: z.nativeEnum(CompanyStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const companyIdSchema = z.object({ id: z.string().min(1) });

export const createCompanySchema = z
  .object({
    companyName: z.string().trim().min(2, "Название компании слишком короткое").max(200),
    ownerFullName: z.string().trim().min(2, "Укажите имя владельца").max(200),
    ownerEmail: email,
    // Учётку владельца заводит оператор, поэтому требования к паролю строже.
    ownerPassword: z
      .string()
      .min(10, "Пароль должен быть не короче 10 символов")
      .max(128)
      .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать букву")
      .regex(/\d/, "Пароль должен содержать цифру"),
    phone: z.string().trim().max(30).optional(),
    defaultLanguage: z.nativeEnum(Language).default(Language.RU),
  })
  .strict();

export const setStatusSchema = z
  .object({
    status: z.nativeEnum(CompanyStatus),
    reason: z.string().trim().max(500).nullable().default(null),
  })
  .strict();

export type ListCompaniesQuery = z.infer<typeof listCompaniesQuerySchema>;
export type CreateCompanyInput = z.infer<typeof createCompanySchema>;
export type SetStatusInput = z.infer<typeof setStatusSchema>;