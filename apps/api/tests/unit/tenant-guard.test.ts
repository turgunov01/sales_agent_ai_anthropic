import { describe, expect, it } from "vitest";
import { TenantScopeError } from "../../src/core/errors.js";
import { assertTenantScope } from "../../src/core/tenant-guard.js";

describe("assertTenantScope", () => {
  it("пропускает чтение данных арендатора со скоупом companyId", () => {
    expect(() =>
      assertTenantScope("Product", "findMany", { where: { companyId: "cmp_1", active: true } }),
    ).not.toThrow();
  });

  it("блокирует чтение данных арендатора без companyId", () => {
    expect(() => assertTenantScope("Product", "findMany", { where: { active: true } })).toThrow(
      TenantScopeError,
    );
  });

  it("блокирует findUnique по одному только id", () => {
    expect(() => assertTenantScope("Lead", "findUnique", { where: { id: "led_1" } })).toThrow(
      TenantScopeError,
    );
  });

  it("не трогает саму компанию и сессии", () => {
    expect(() => assertTenantScope("Company", "findUnique", { where: { id: "cmp_1" } })).not.toThrow();
    expect(() =>
      assertTenantScope("Session", "findUnique", { where: { refreshTokenHash: "hash" } }),
    ).not.toThrow();
  });

  it("требует companyId при создании", () => {
    expect(() => assertTenantScope("Product", "create", { data: { name: "Диван" } })).toThrow(
      TenantScopeError,
    );
    expect(() =>
      assertTenantScope("Product", "create", { data: { companyId: "cmp_1", name: "Диван" } }),
    ).not.toThrow();
  });

  it("принимает связь company вместо скалярного companyId", () => {
    expect(() =>
      assertTenantScope("Product", "create", {
        data: { company: { connect: { id: "cmp_1" } }, name: "Диван" },
      }),
    ).not.toThrow();
  });

  it("проверяет каждую строку createMany", () => {
    expect(() =>
      assertTenantScope("Product", "createMany", {
        data: [{ companyId: "cmp_1", name: "A" }, { name: "B" }],
      }),
    ).toThrow(TenantScopeError);
  });

  it("понимает составной уникальный ключ companyId_externalId", () => {
    expect(() =>
      assertTenantScope("Product", "upsert", {
        where: { companyId_externalId: { companyId: "cmp_1", externalId: "SF-001" } },
        create: { companyId: "cmp_1", name: "Диван" },
        update: {},
      }),
    ).not.toThrow();
  });

  it("отклоняет upsert без companyId в create", () => {
    expect(() =>
      assertTenantScope("Customer", "upsert", {
        where: { companyId_channelType_externalId: { companyId: "cmp_1", channelType: "TELEGRAM", externalId: "1" } },
        create: { externalId: "1" },
        update: {},
      }),
    ).toThrow(TenantScopeError);
  });

  it("принимает OR, только если companyId есть в каждой ветке", () => {
    expect(() =>
      assertTenantScope("Lead", "findMany", {
        where: { OR: [{ companyId: "cmp_1", status: "NEW" }, { companyId: "cmp_1", status: "WON" }] },
      }),
    ).not.toThrow();

    expect(() =>
      assertTenantScope("Lead", "findMany", {
        where: { OR: [{ companyId: "cmp_1" }, { status: "WON" }] },
      }),
    ).toThrow(TenantScopeError);
  });

  it("требует скоуп для агрегатов и удаления", () => {
    expect(() => assertTenantScope("Message", "count", { where: {} })).toThrow(TenantScopeError);
    expect(() => assertTenantScope("Message", "deleteMany", { where: { id: "m1" } })).toThrow(
      TenantScopeError,
    );
  });
});