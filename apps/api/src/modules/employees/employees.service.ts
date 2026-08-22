import { UserRole, type UserDto } from "@ai-sales/shared";
import { conflict, forbidden, notFound } from "../../core/errors.js";
import { hashPassword } from "../../core/security/password.js";
import type { AuthContext } from "../../core/security/tokens.js";
import type { Repositories } from "../../domain/repositories.js";
import { toUserDto } from "../shared/mappers.js";
import type { CreateEmployeeInput, UpdateEmployeeInput } from "./employees.schema.js";

export class EmployeesService {
  constructor(private readonly repos: Repositories) {}

  async list(auth: AuthContext): Promise<UserDto[]> {
    const users = await this.repos.users.listByCompany(auth.companyId);
    return users.map(toUserDto);
  }

  async create(auth: AuthContext, input: CreateEmployeeInput): Promise<UserDto> {
    const existing = await this.repos.users.findByEmail(input.email);
    if (existing) throw conflict("Пользователь с таким email уже существует");

    if (input.role === UserRole.OWNER && auth.role !== UserRole.OWNER) {
      throw forbidden("Назначить владельца может только владелец");
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repos.users.create({
      companyId: auth.companyId,
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      role: input.role,
    });
    return toUserDto(user);
  }

  async update(auth: AuthContext, userId: string, input: UpdateEmployeeInput): Promise<UserDto> {
    const target = await this.repos.users.findById(auth.companyId, userId);
    if (!target) throw notFound("Сотрудник не найден");

    if (userId === auth.userId && input.role && input.role !== target.role) {
      throw forbidden("Нельзя изменить собственную роль");
    }
    if (userId === auth.userId && input.isActive === false) {
      throw forbidden("Нельзя отключить собственную учётную запись");
    }
    if (input.role === UserRole.OWNER && auth.role !== UserRole.OWNER) {
      throw forbidden("Назначить владельца может только владелец");
    }

    const losesOwnerRights =
      target.role === UserRole.OWNER &&
      ((input.role !== undefined && input.role !== UserRole.OWNER) || input.isActive === false);

    if (losesOwnerRights) {
      const owners = await this.repos.users.countOwners(auth.companyId);
      if (owners <= 1) throw conflict("В компании должен остаться хотя бы один владелец");
    }

    const updated = await this.repos.users.update(auth.companyId, userId, input);
    if (!updated) throw notFound("Сотрудник не найден");
    return toUserDto(updated);
  }

  async remove(auth: AuthContext, userId: string): Promise<void> {
    if (userId === auth.userId) throw forbidden("Нельзя удалить собственную учётную запись");

    const target = await this.repos.users.findById(auth.companyId, userId);
    if (!target) throw notFound("Сотрудник не найден");

    if (target.role === UserRole.OWNER) {
      const owners = await this.repos.users.countOwners(auth.companyId);
      if (owners <= 1) throw conflict("В компании должен остаться хотя бы один владелец");
    }

    const deleted = await this.repos.users.delete(auth.companyId, userId);
    if (!deleted) throw notFound("Сотрудник не найден");
  }
}