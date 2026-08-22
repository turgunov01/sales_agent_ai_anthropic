import { describe, expect, it } from "vitest";
import {
  fromOpenAiResponse,
  resolveModel,
  toOpenAiMessages,
  toOpenAiTools,
} from "../../src/modules/ai/openai.client.js";
import { TOOL_DEFINITIONS } from "../../src/modules/ai/tools/definitions.js";

describe("перевод инструментов в формат OpenAI", () => {
  it("оборачивает каждый инструмент в function", () => {
    const tools = toOpenAiTools(TOOL_DEFINITIONS);
    expect(tools).toHaveLength(TOOL_DEFINITIONS.length);

    const first = tools[0] as { type: string; function: Record<string, unknown> };
    expect(first.type).toBe("function");
    expect(first.function.name).toBe("search_products");
    expect(first.function.parameters).toEqual(TOOL_DEFINITIONS[0]?.input_schema);
  });
});

describe("перевод истории диалога", () => {
  it("ставит system первым сообщением", () => {
    const result = toOpenAiMessages("Ты продавец", [{ role: "user", content: "Привет" }]);
    expect(result[0]).toEqual({ role: "system", content: "Ты продавец" });
    expect(result[1]).toEqual({ role: "user", content: "Привет" });
  });

  it("превращает tool_use в tool_calls внутри assistant", () => {
    const result = toOpenAiMessages("S", [
      { role: "user", content: "Нужен диван" },
      {
        role: "assistant",
        content: [
          { type: "text", text: "Ищу" },
          { type: "tool_use", id: "call_1", name: "search_products", input: { query: "диван" } },
        ],
      },
    ]);

    const assistant = result[2] as {
      role: string;
      content: string | null;
      tool_calls: Array<{ id: string; function: { name: string; arguments: string } }>;
    };
    expect(assistant.role).toBe("assistant");
    expect(assistant.content).toBe("Ищу");
    expect(assistant.tool_calls[0]?.id).toBe("call_1");
    expect(assistant.tool_calls[0]?.function.name).toBe("search_products");
    expect(JSON.parse(assistant.tool_calls[0]?.function.arguments ?? "{}")).toEqual({
      query: "диван",
    });
  });

  it("разворачивает tool_result в отдельные сообщения role: tool", () => {
    const result = toOpenAiMessages("S", [
      { role: "user", content: "Нужен диван" },
      {
        role: "user",
        content: [
          { type: "tool_result", tool_use_id: "call_1", content: '{"count":2}' },
          { type: "tool_result", tool_use_id: "call_2", content: '{"lead_id":"led_1"}' },
        ],
      },
    ]);

    expect(result).toHaveLength(4);
    expect(result[2]).toEqual({
      role: "tool",
      tool_call_id: "call_1",
      content: '{"count":2}',
    });
    expect(result[3]?.role).toBe("tool");
  });
});

describe("разбор ответа OpenAI", () => {
  it("читает текст и расход токенов", () => {
    const result = fromOpenAiResponse({
      choices: [{ finish_reason: "stop", message: { content: "Здравствуйте!" } }],
      usage: { prompt_tokens: 120, completion_tokens: 15 },
    });

    expect(result.content).toEqual([{ type: "text", text: "Здравствуйте!" }]);
    expect(result.stopReason).toBe("stop");
    expect(result.usage).toEqual({ inputTokens: 120, outputTokens: 15 });
  });

  it("превращает tool_calls в tool_use и нормализует stop_reason", () => {
    const result = fromOpenAiResponse({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: null,
            tool_calls: [
              {
                id: "call_9",
                type: "function",
                function: { name: "create_lead", arguments: '{"interest":"диван"}' },
              },
            ],
          },
        },
      ],
    });

    expect(result.stopReason).toBe("tool_use");
    expect(result.content[0]).toEqual({
      type: "tool_use",
      id: "call_9",
      name: "create_lead",
      input: { interest: "диван" },
    });
  });

  it("не падает на невалидном JSON в аргументах", () => {
    const result = fromOpenAiResponse({
      choices: [
        {
          finish_reason: "tool_calls",
          message: {
            content: null,
            tool_calls: [
              { id: "c", type: "function", function: { name: "get_product", arguments: "{oops" } },
            ],
          },
        },
      ],
    });

    expect(result.content[0]).toMatchObject({ type: "tool_use", input: {} });
  });

  it("пустой ответ не даёт мусорных блоков", () => {
    const result = fromOpenAiResponse({ choices: [{ finish_reason: "stop", message: { content: "  " } }] });
    expect(result.content).toHaveLength(0);
  });
});

describe("выбор модели", () => {
  it("подменяет модель чужого провайдера", () => {
    expect(resolveModel("claude-sonnet-5", "gpt-4.1-mini")).toBe("gpt-4.1-mini");
    expect(resolveModel("", "gpt-4.1-mini")).toBe("gpt-4.1-mini");
  });

  it("уважает явно заданную модель OpenAI", () => {
    expect(resolveModel("gpt-5.1", "gpt-4.1-mini")).toBe("gpt-5.1");
  });
});