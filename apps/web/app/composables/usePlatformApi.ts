import type { PaginationMeta } from "@ai-sales/shared";
import { ApiRequestError } from "./useApi";

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  query?: Record<string, unknown>;
  allowRetry?: boolean;
}

function toApiError(error: unknown): ApiRequestError {
  const candidate = error as {
    status?: number;
    data?: { error?: { message?: string; code?: never } };
  };
  const message = candidate?.data?.error?.message;
  return new ApiRequestError(
    "INTERNAL_ERROR",
    message ?? "Не удалось связаться с сервером",
    [],
    candidate?.status ?? 0,
  );
}

/** Клиент платформенных маршрутов: свой токен, свой обработчик 401. */
export function usePlatformApi() {
  const config = useRuntimeConfig();
  const auth = usePlatformAuthStore();

  async function envelope<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
    const headers: Record<string, string> = {};
    if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;

    try {
      const payload = await $fetch<Envelope<T> | string | null>(
        `${config.public.apiBase}/platform${path}`,
        {
          method: options.method ?? "GET",
          headers,
          body: options.body as Record<string, unknown> | undefined,
          query: options.query,
        },
      );
      if (payload === null || payload === undefined || payload === "") {
        return { success: true, data: undefined as T };
      }
      return payload as Envelope<T>;
    } catch (error) {
      const apiError = toApiError(error);
      if (apiError.status === 401 && options.allowRetry !== false && (await auth.refresh())) {
        return envelope<T>(path, { ...options, allowRetry: false });
      }
      if (apiError.status === 401) {
        auth.clear();
        await navigateTo("/platform/login");
      }
      throw apiError;
    }
  }

  return {
    get: <T>(path: string, query?: Record<string, unknown>) =>
      envelope<T>(path, query ? { query } : {}).then((response) => response.data),
    getPaged: <T>(path: string, query?: Record<string, unknown>) =>
      envelope<T>(path, query ? { query } : {}),
    post: <T>(path: string, body?: unknown) =>
      envelope<T>(path, { method: "POST", body }).then((response) => response.data),
  };
}