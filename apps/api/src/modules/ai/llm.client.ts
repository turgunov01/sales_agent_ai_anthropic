/**
 * Порт модели. Реализация одна — OpenAI (modules/ai/openai.client.ts).
 * Тесты подставляют фейк и проверяют весь цикл tool-use без сети.
 */

export interface LlmToolDefinition {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface LlmTextBlock {
  type: "text";
  text: string;
}

export interface LlmToolUseBlock {
  type: "tool_use";
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface LlmToolResultBlock {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export type LlmRequestBlock = LlmTextBlock | LlmToolUseBlock | LlmToolResultBlock;
export type LlmResponseBlock = LlmTextBlock | LlmToolUseBlock;

export interface LlmMessage {
  role: "user" | "assistant";
  content: string | LlmRequestBlock[];
}

export interface LlmRequest {
  model: string;
  system: string;
  messages: LlmMessage[];
  tools: LlmToolDefinition[];
  maxTokens: number;
  temperature: number;
}

export interface LlmResponse {
  content: LlmResponseBlock[];
  stopReason: string | null;
  usage: { inputTokens: number; outputTokens: number };
}

export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export class LlmUnavailableError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

/** Заглушка на случай отсутствия ключа: агент честно деградирует, а не падает. */
export class DisabledLlmClient implements LlmClient {
  async complete(): Promise<LlmResponse> {
    throw new LlmUnavailableError("OPENAI_API_KEY не задан");
  }
}