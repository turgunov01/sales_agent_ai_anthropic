import { ApiErrorCode, HTTP_STATUS_BY_ERROR_CODE, type ApiErrorDetail } from "@ai-sales/shared";

/**
 * Единственный тип ошибки, который знает HTTP-слой.
 * Всё остальное считается непредвиденным сбоем и превращается в INTERNAL_ERROR.
 */
export class AppError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  readonly details?: ApiErrorDetail[];
  override readonly cause?: unknown;

  constructor(
    code: ApiErrorCode,
    message: string,
    options: { details?: ApiErrorDetail[]; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = HTTP_STATUS_BY_ERROR_CODE[code];
    if (options.details) this.details = options.details;
    if (options.cause !== undefined) this.cause = options.cause;
  }
}

export const badRequest = (message: string, details?: ApiErrorDetail[]): AppError =>
  new AppError(ApiErrorCode.VALIDATION_ERROR, message, details ? { details } : {});

export const unauthorized = (message = "Требуется авторизация"): AppError =>
  new AppError(ApiErrorCode.UNAUTHORIZED, message);

export const forbidden = (message = "Недостаточно прав"): AppError =>
  new AppError(ApiErrorCode.FORBIDDEN, message);

export const notFound = (message = "Ресурс не найден"): AppError =>
  new AppError(ApiErrorCode.NOT_FOUND, message);

export const conflict = (message: string): AppError =>
  new AppError(ApiErrorCode.CONFLICT, message);

export const rateLimited = (message = "Слишком много запросов, попробуйте позже"): AppError =>
  new AppError(ApiErrorCode.RATE_LIMITED, message);

export const aiUnavailable = (message = "AI-ассистент временно недоступен"): AppError =>
  new AppError(ApiErrorCode.AI_UNAVAILABLE, message);

export const channelError = (message: string, cause?: unknown): AppError =>
  new AppError(ApiErrorCode.CHANNEL_ERROR, message, cause !== undefined ? { cause } : {});

export const internal = (message = "Внутренняя ошибка сервера", cause?: unknown): AppError =>
  new AppError(ApiErrorCode.INTERNAL_ERROR, message, cause !== undefined ? { cause } : {});

/** Нарушение изоляции арендаторов — всегда дефект кода, не пользовательская ошибка. */
export class TenantScopeError extends Error {
  constructor(model: string, operation: string) {
    super(`Запрос к модели "${model}" операцией "${operation}" выполнен без companyId`);
    this.name = "TenantScopeError";
  }
}