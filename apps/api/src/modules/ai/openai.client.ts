import { logger } from "../../core/logger.js";
import {
  LlmUnavailableError,
  type LlmClient,
  type LlmRequest,
  type LlmResponse,
  type LlmResponseBlock,
  type LlmToolDefinition,
  type LlmToolResultBlock,
  type LlmToolUseBlock,
} from "./llm.client.js";

/**
 * Адаптер OpenAI Chat Completions под тот же порт LlmClient, что и Claude.
 * Различия форматов живут только здесь: агент, инструменты и тесты не меняются.
 *
 * Ключевые расхождения, которые переводит адаптер:
 *   Anthropic tool_use  -> OpenAI tool_calls внутри assistant-сообщения
 *   Anthropic tool_result (в user-сообщении) -> отдельные сообщения role: "tool"
 *   input_schema -> function.parameters
 */

interface OpenAiToolCall {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
}

interface OpenAiMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_calls?: OpenAiToolCall[];
  tool_call_id?: string;
}

interface OpenAiChoice {
  finish_reason: string | null;
  message: { content: string | null; tool_calls?: OpenAiToolCall[] };
}

interface OpenAiResponse {
  choices: OpenAiChoice[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  error?: { message: string; type?: string };
}

export function toOpenAiTools(tools: LlmToolDefinition[]): Array<Record<string, unknown>> {
  return tools.map((tool) => ({
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.input_schema,
    },
  }));
}

/** История в формате Anthropic -> история в формате OpenAI. */
export function toOpenAiMessages(system: string, messages: LlmRequest["messages"]): OpenAiMessage[] {
  const result: OpenAiMessage[] = [{ role: "system", content: system }];

  for (const message of messages) {
    if (typeof message.content === "string") {
      result.push({ role: message.role, content: message.content });
      continue;
    }

    const texts: string[] = [];
    const toolCalls: OpenAiToolCall[] = [];
    const toolResults: LlmToolResultBlock[] = [];

    for (const block of message.content) {
      if (block.type === "text") texts.push(block.text);
      else if (block.type === "tool_use") {
        toolCalls.push({
          id: block.id,
          type: "function",
          function: { name: block.name, arguments: JSON.stringify(block.input ?? {}) },
        });
      } else if (block.type === "tool_result") {
        toolResults.push(block);
      }
    }

    // Результаты инструментов у OpenAI — отдельные сообщения, а не блоки внутри user.
    if (toolResults.length > 0) {
      for (const item of toolResults) {
        result.push({ role: "tool", tool_call_id: item.tool_use_id, content: item.content });
      }
      continue;
    }

    const content = texts.length > 0 ? texts.join("\n\n") : null;
    if (message.role === "assistant" && toolCalls.length > 0) {
      result.push({ role: "assistant", content, tool_calls: toolCalls });
    } else if (content !== null) {
      result.push({ role: message.role, content });
    }
  }

  return result;
}

export function fromOpenAiResponse(payload: OpenAiResponse): LlmResponse {
  const choice = payload.choices[0];
  const content: LlmResponseBlock[] = [];

  const text = choice?.message.content;
  if (text && text.trim().length > 0) content.push({ type: "text", text });

  for (const call of choice?.message.tool_calls ?? []) {
    let input: Record<string, unknown> = {};
    try {
      input = JSON.parse(call.function.arguments || "{}") as Record<string, unknown>;
    } catch {
      // Модель вернула невалидный JSON — исполнитель ответит ошибкой валидации,
      // и диалог продолжится вместо падения.
      logger.warn({ tool: call.function.name }, "OpenAI вернул неразбираемые аргументы инструмента");
    }
    const block: LlmToolUseBlock = {
      type: "tool_use",
      id: call.id,
      name: call.function.name,
      input,
    };
    content.push(block);
  }

  const finish = choice?.finish_reason ?? null;
  return {
    content,
    stopReason: finish === "tool_calls" ? "tool_use" : (finish ?? null),
    usage: {
      inputTokens: payload.usage?.prompt_tokens ?? 0,
      outputTokens: payload.usage?.completion_tokens ?? 0,
    },
  };
}

/** Модель, сохранённая для другого провайдера, не должна ломать запрос. */
export function resolveModel(requested: string, fallback: string): string {
  const belongsToOtherProvider = /^claude/i.test(requested.trim());
  return belongsToOtherProvider || requested.trim().length === 0 ? fallback : requested;
}

export class OpenAiLlmClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly defaultModel: string,
    private readonly timeoutMs: number,
    private readonly baseUrl = "https://api.openai.com/v1",
  ) {}

  async complete(request: LlmRequest): Promise<LlmResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: resolveModel(request.model, this.defaultModel),
          messages: toOpenAiMessages(request.system, request.messages),
          ...(request.tools.length > 0 ? { tools: toOpenAiTools(request.tools) } : {}),
          max_completion_tokens: request.maxTokens,
          temperature: request.temperature,
        }),
        signal: controller.signal,
      });

      const payload = (await response.json()) as OpenAiResponse;
      if (!response.ok || payload.error) {
        const message = payload.error?.message ?? `HTTP ${response.status}`;
        logger.error({ status: response.status, message }, "OpenAI вернул ошибку");
        throw new LlmUnavailableError(`OpenAI: ${message}`);
      }

      return fromOpenAiResponse(payload);
    } catch (error) {
      if (error instanceof LlmUnavailableError) throw error;
      if (error instanceof Error && error.name === "AbortError") {
        throw new LlmUnavailableError("OpenAI не ответил вовремя");
      }
      logger.error({ err: error }, "Сбой обращения к OpenAI");
      throw new LlmUnavailableError("Модель недоступна", error);
    } finally {
      clearTimeout(timer);
    }
  }
}