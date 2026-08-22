import { defineStore } from "pinia";
import type { AuthTokensDto, PlatformAdminDto } from "@ai-sales/shared";

const ACCESS_KEY = "ai-sales.platform.access";
const REFRESH_KEY = "ai-sales.platform.refresh";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/**
 * Сессия оператора платформы. Намеренно отдельна от useAuthStore:
 * другие ключи хранилища, другой токен, другой маршрут входа —
 * кабинет компании и платформа не должны пересекаться нигде.
 */
export const usePlatformAuthStore = defineStore("platformAuth", () => {
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const admin = ref<PlatformAdminDto | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value));

  const apiBase = (): string => useRuntimeConfig().public.apiBase;

  function persist(tokens: AuthTokensDto): void {
    accessToken.value = tokens.accessToken;
    refreshToken.value = tokens.refreshToken;
    if (import.meta.client) {
      localStorage.setItem(ACCESS_KEY, tokens.accessToken);
      localStorage.setItem(REFRESH_KEY, tokens.refreshToken);
    }
  }

  function clear(): void {
    accessToken.value = null;
    refreshToken.value = null;
    admin.value = null;
    if (import.meta.client) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await $fetch<ApiEnvelope<{ admin: PlatformAdminDto; tokens: AuthTokensDto }>>(
      `${apiBase()}/platform/auth/login`,
      { method: "POST", body: { email, password } },
    );
    admin.value = response.data.admin;
    persist(response.data.tokens);
  }

  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false;
    try {
      const response = await $fetch<ApiEnvelope<AuthTokensDto>>(
        `${apiBase()}/platform/auth/refresh`,
        { method: "POST", body: { refreshToken: refreshToken.value } },
      );
      persist(response.data);
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function fetchMe(allowRetry = true): Promise<void> {
    if (!accessToken.value) return;
    try {
      const response = await $fetch<ApiEnvelope<PlatformAdminDto>>(`${apiBase()}/platform/auth/me`, {
        headers: { Authorization: `Bearer ${accessToken.value}` },
      });
      admin.value = response.data;
    } catch {
      if (!allowRetry) {
        clear();
        return;
      }
      if (await refresh()) await fetchMe(false);
      else clear();
    }
  }

  async function logout(): Promise<void> {
    const token = refreshToken.value;
    clear();
    if (token) {
      await $fetch(`${apiBase()}/platform/auth/logout`, {
        method: "POST",
        body: { refreshToken: token },
      }).catch(() => undefined);
    }
    await navigateTo("/platform/login");
  }

  async function restore(): Promise<void> {
    if (initialized.value || !import.meta.client) return;
    accessToken.value = localStorage.getItem(ACCESS_KEY);
    refreshToken.value = localStorage.getItem(REFRESH_KEY);
    if (accessToken.value) await fetchMe();
    initialized.value = true;
  }

  return {
    accessToken,
    admin,
    isAuthenticated,
    login,
    refresh,
    fetchMe,
    logout,
    restore,
    clear,
  };
});