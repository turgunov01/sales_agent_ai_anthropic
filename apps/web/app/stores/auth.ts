import { defineStore } from "pinia";
import type { AuthResultDto, AuthTokensDto, CompanyDto, UserDto } from "@ai-sales/shared";

const ACCESS_KEY = "ai-sales.access";
const REFRESH_KEY = "ai-sales.refresh";

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

/**
 * Хранилище сессии. Обращается к API напрямую, а не через useApi,
 * чтобы не создавать циклическую зависимость с перехватчиком 401.
 */
export const useAuthStore = defineStore("auth", () => {
  const accessToken = ref<string | null>(null);
  const refreshToken = ref<string | null>(null);
  const user = ref<UserDto | null>(null);
  const company = ref<CompanyDto | null>(null);
  const initialized = ref(false);

  const isAuthenticated = computed(() => Boolean(accessToken.value));
  const canManage = computed(() => user.value?.role === "OWNER" || user.value?.role === "ADMIN");
  const isOwner = computed(() => user.value?.role === "OWNER");

  function apiBase(): string {
    return useRuntimeConfig().public.apiBase;
  }

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
    user.value = null;
    company.value = null;
    if (import.meta.client) {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    }
  }

  function applyAuthResult(result: AuthResultDto): void {
    user.value = result.user;
    company.value = result.company;
    persist(result.tokens);
  }

  async function login(email: string, password: string): Promise<void> {
    const response = await $fetch<ApiEnvelope<AuthResultDto>>(`${apiBase()}/auth/login`, {
      method: "POST",
      body: { email, password },
    });
    applyAuthResult(response.data);
  }

  async function register(payload: {
    companyName: string;
    fullName: string;
    email: string;
    password: string;
    phone?: string;
  }): Promise<void> {
    const response = await $fetch<ApiEnvelope<AuthResultDto>>(`${apiBase()}/auth/register`, {
      method: "POST",
      body: payload,
    });
    applyAuthResult(response.data);
  }

  async function refresh(): Promise<boolean> {
    if (!refreshToken.value) return false;
    try {
      const response = await $fetch<ApiEnvelope<AuthTokensDto>>(`${apiBase()}/auth/refresh`, {
        method: "POST",
        body: { refreshToken: refreshToken.value },
      });
      persist(response.data);
      return true;
    } catch {
      clear();
      return false;
    }
  }

  async function fetchMe(): Promise<void> {
    if (!accessToken.value) return;
    try {
      const response = await $fetch<ApiEnvelope<{ user: UserDto; company: CompanyDto }>>(
        `${apiBase()}/auth/me`,
        { headers: { Authorization: `Bearer ${accessToken.value}` } },
      );
      user.value = response.data.user;
      company.value = response.data.company;
    } catch {
      const refreshed = await refresh();
      if (!refreshed) clear();
    }
  }

  async function logout(): Promise<void> {
    const token = refreshToken.value;
    clear();
    if (token) {
      await $fetch(`${apiBase()}/auth/logout`, {
        method: "POST",
        body: { refreshToken: token },
      }).catch(() => undefined);
    }
    await navigateTo("/login");
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
    refreshToken,
    user,
    company,
    initialized,
    isAuthenticated,
    canManage,
    isOwner,
    login,
    register,
    refresh,
    fetchMe,
    logout,
    restore,
    clear,
  };
});