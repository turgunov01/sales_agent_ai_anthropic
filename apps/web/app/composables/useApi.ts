import type { ApiErrorCode, ApiErrorDetail, PaginationMeta } from "@ai-sales/shared";

export class ApiRequestError extends Error {
  constructor(
    readonly code: ApiErrorCode | "NETWORK_ERROR",
    message: string,
    readonly details: ApiErrorDetail[] = [],
    readonly status = 0,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

interface Envelope<T> {
  success: boolean;
  data: T;
  meta?: PaginationMeta;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, unknown>;
  contentType?: string;
  allowRetry?: boolean;
}

function toApiError(error: unknown): ApiRequestError {
  const candidate = error as {
    status?: number;
    data?: { error?: { code?: ApiErrorCode; message?: string; details?: ApiErrorDetail[] } };
  };
  const payload = candidate?.data?.error;

  if (payload?.message) {
    return new ApiRequestError(
      payload.code ?? "INTERNAL_ERROR",
      payload.message,
      payload.details ?? [],
      candidate.status ?? 0,
    );
  }

  return new ApiRequestError(
    "NETWORK_ERROR",
    "Не удалось связаться с сервером. Проверьте подключение.",
    [],
    candidate?.status ?? 0,
  );
}

/**
 * Клиент API: подставляет токен, разворачивает конверт ответа
 * и один раз пробует обновить сессию при 401.
 */
export function useApi() {
  const config = useRuntimeConfig();
  const auth = useAuthStore();

  async function envelope<T>(path: string, options: RequestOptions = {}): Promise<Envelope<T>> {
    const headers: Record<string, string> = {};
    if (auth.accessToken) headers.Authorization = `Bearer ${auth.accessToken}`;
    if (options.contentType) headers["Content-Type"] = options.contentType;

    try {
      return await $fetch<Envelope<T>>(`${config.public.apiBase}${path}`, {
        method: options.method ?? "GET",
        headers,
        body: options.body as Record<string, unknown> | undefined,
        query: options.query,
      });
    } catch (error) {
      const apiError = toApiError(error);
      const canRetry = apiError.status === 401 && options.allowRetry !== false;

      if (canRetry && (await auth.refresh())) {
        return envelope<T>(path, { ...options, allowRetry: false });
      }

      if (apiError.status === 401) {
        auth.clear();
        await navigateTo("/login");
      }

      throw apiError;
    }
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const response = await envelope<T>(path, options);
    return response.data;
  }

  return {
    get: <T>(path: string, query?: Record<string, unknown>) =>
      request<T>(path, query ? { query } : {}),
    getPaged: <T>(path: string, query?: Record<string, unknown>) =>
      envelope<T>(path, query ? { query } : {}),
    post: <T>(path: string, body?: unknown) => request<T>(path, { method: "POST", body }),
    patch: <T>(path: string, body?: unknown) => request<T>(path, { method: "PATCH", body }),
    put: <T>(path: string, body?: unknown) => request<T>(path, { method: "PUT", body }),
    del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
    postRaw: <T>(path: string, body: string, contentType: string) =>
      request<T>(path, { method: "POST", body, contentType }),
  };
}