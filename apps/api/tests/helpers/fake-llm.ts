import type {
  LlmClient,
  LlmRequest,
  LlmResponse,
  LlmResponseBlock,
} from "../../src/modules/ai/llm.client.js";

export function textResponse(text: string): LlmResponse {
  return {
    content: [{ type: "text", text }],
    stopReason: "end_turn",
    usage: { inputTokens: 100, outputTokens: 50 },
  };
}

export function toolUseResponse(
  name: string,
  input: Record<string, unknown>,
  options: { id?: string; text?: string } = {},
): LlmResponse {
  const content: LlmResponseBlock[] = [];
  if (options.text) content.push({ type: "text", text: options.text });
  content.push({ type: "tool_use", id: options.id ?? `tool_${name}`, name, input });
  return {
    content,
    stopReason: "tool_use",
    usage: { inputTokens: 120, outputTokens: 60 },
  };
}

/**
 * Фейковый клиент модели: отдаёт заранее заданную последовательность ответов
 * и запоминает запросы. Позволяет проверить полный цикл tool-use без сети.
 */
export class FakeLlmClient implements LlmClient {
  readonly requests: LlmRequest[] = [];
  private queue: LlmResponse[] = [];
  private failure: Error | null = null;

  script(...responses: LlmResponse[]): this {
    this.queue.push(...responses);
    return this;
  }

  failWith(error: Error): this {
    this.failure = error;
    return this;
  }

  reset(): void {
    this.requests.length = 0;
    this.queue = [];
    this.failure = null;
  }

  get lastRequest(): LlmRequest | undefined {
    return this.requests[this.requests.length - 1];
  }

  async complete(request: LlmRequest): Promise<LlmResponse> {
    this.requests.push(request);
    if (this.failure) throw this.failure;
    return this.queue.shift() ?? textResponse("Готов помочь!");
  }
}