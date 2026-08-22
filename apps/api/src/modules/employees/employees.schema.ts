import { z } from "zod";
import { UserRole } from "@ai-sales/shared";

export const createEmployeeSchema = z
  .object({
    email: z.string().trim().toLowerCase().email("Некорректный email").max(200),
    fullName: z.string().trim().min(2, "Укажите имя").max(200),
    password: z
      .string()
      .min(8, "Пароль должен быть не короче 8 символов")
      .max(128)
      .regex(/[A-Za-zА-Яа-я]/, "Пароль должен содержать букву")
      .regex(/\d/, "Пароль должен содержать цифру"),
    role: z.nativeEnum(UserRole).default(UserRole.MANAGER),
  })
  .strict();

export const updateEmployeeSchema = z
  .object({
    fullName: z.string().trim().min(2).max(200).optional(),
    role: z.nativeEnum(UserRole).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, "Нечего обновлять");

export const employeeIdSchema = z.object({ id: z.string().min(1) });

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;