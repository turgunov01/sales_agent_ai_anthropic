import Anthropic from "@anthropic-ai/sdk";
import { env } from "../../config/env.js";
import { logger } from "../../core/logger.js";

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

/** Порт модели. Тесты подставляют фейк и проверяют весь цикл tool-use без сети. */
export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmResponse>;
}

export class LlmUnavailableError extends Error {
  constructor(message: string, override readonly cause?: unknown) {
    super(message);
    this.name = "LlmUnavailableError";
  }
}

export class AnthropicLlmClient implements LlmClient {
  private readonly client: Anthropic;

  constructor(apiKey: string, private readonly timeoutMs: number = env.AI_REQUEST_TIMEOUT_MS) {
    this.client = new Anthropic({ apiKey, timeout: this.timeoutMs, maxRetries: 1 });
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    try {
      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: request.maxTokens,
        temperature: request.temperature,
        system: request.system,
        messages: request.messages as Anthropic.MessageParam[],
        ...(request.tools.length > 0 ? { tools: request.tools as Anthropic.Tool[] } : {}),
      });

      const content: LlmResponseBlock[] = [];
      for (const block of response.content) {
        if (block.type === "text") {
          content.push({ type: "text", text: block.text });
        } else if (block.type === "tool_use") {
          content.push({
            type: "tool_use",
            id: block.id,
            name: block.name,
            input: (block.input ?? {}) as Record<string, unknown>,
          });
        }
      }

      return {
        content,
        stopReason: response.stop_reason ?? null,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
        },
      };
    } catch (error) {
      logger.error({ err: error }, "Ошибка обращения к Claude API");
      throw new LlmUnavailableError("Модель недоступна", error);
    }
  }
}

/** Заглушка на случай отсутствия ключа: агент честно деградирует, а не падает. */
export class DisabledLlmClient implements LlmClient {
  async complete(): Promise<LlmResponse> {
    throw new LlmUnavailableError("ANTHROPIC_API_KEY не задан");
  }
}