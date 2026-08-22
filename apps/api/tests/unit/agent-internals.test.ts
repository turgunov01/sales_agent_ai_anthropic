import { describe, expect, it } from "vitest";
import { MessageRole, MessageType } from "@ai-sales/shared";
import type { MessageEntity } from "../../src/domain/entities.js";
import { dedupeEffects, toLlmMessages } from "../../src/modules/ai/agent.service.js";
import type { AgentEffect } from "../../src/modules/ai/types.js";

let sequence = 0;
function message(role: MessageEntity["role"], content: string): MessageEntity {
  sequence += 1;
  return {
    id: `msg_${sequence}`,
    companyId: "cmp_1",
    conversationId: "cnv_1",
    role,
    type: MessageType.TEXT,
    content,
    attachments: null,
    toolCalls: null,
    tokensIn: null,
    tokensOut: null,
    createdAt: new Date(1_700_000_000_000 + sequence * 1000),
  };
}

describe("toLlmMessages", () => {
  it("переводит роли домена в роли модели", () => {
    const result = toLlmMessages([
      message(MessageRole.CUSTOMER, "Привет"),
      message(MessageRole.ASSISTANT, "Здравствуйте!"),
      message(MessageRole.CUSTOMER, "Нужен диван"),
    ]);

    expect(result).toEqual([
      { role: "user", content: "Привет" },
      { role: "assistant", content: "Здравствуйте!" },
      { role: "user", content: "Нужен диван" },
    ]);
  });

  it("не передаёт системные события модели", () => {
    const result = toLlmMessages([
      message(MessageRole.CUSTOMER, "Привет"),
      message(MessageRole.SYSTEM, "Менеджер подключился"),
      message(MessageRole.CUSTOMER, "Есть шкафы?"),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe("Привет\nЕсть шкафы?");
  });

  it("склеивает подряд идущие сообщения одной роли", () => {
    const result = toLlmMessages([
      message(MessageRole.CUSTOMER, "Здравствуйте"),
      message(MessageRole.CUSTOMER, "Нужен диван"),
    ]);

    expect(result).toHaveLength(1);
    expect(result[0]?.content).toBe("Здравствуйте\nНужен диван");
  });

  it("считает ответ менеджера ответом ассистента", () => {
    const result = toLlmMessages([
      message(MessageRole.CUSTOMER, "Привет"),
      message(MessageRole.MANAGER, "Отвечает менеджер"),
      message(MessageRole.CUSTOMER, "Спасибо"),
    ]);

    expect(result[1]).toEqual({ role: "assistant", content: "Отвечает менеджер" });
  });

  it("обрезает висящие сообщения ассистента по краям", () => {
    const result = toLlmMessages([
      message(MessageRole.ASSISTANT, "Здравствуйте!"),
      message(MessageRole.CUSTOMER, "Нужен диван"),
      message(MessageRole.ASSISTANT, "Сейчас подберу"),
    ]);

    expect(result).toEqual([{ role: "user", content: "Нужен диван" }]);
  });

  it("возвращает пустой список, если говорить нечего", () => {
    expect(toLlmMessages([])).toEqual([]);
    expect(toLlmMessages([message(MessageRole.SYSTEM, "событие")])).toEqual([]);
  });
});

describe("dedupeEffects", () => {
  it("не показывает один товар дважды", () => {
    const effects: AgentEffect[] = [
      { type: "SHOW_PRODUCTS", productIds: ["p1", "p2"] },
      { type: "SHOW_PRODUCTS", productIds: ["p2", "p3"] },
    ];

    expect(dedupeEffects(effects)).toEqual([
      { type: "SHOW_PRODUCTS", productIds: ["p1", "p2"] },
      { type: "SHOW_PRODUCTS", productIds: ["p3"] },
    ]);
  });

  it("оставляет один запрос контакта и одну передачу менеджеру", () => {
    const effects: AgentEffect[] = [
      { type: "REQUEST_CONTACT", reason: "первый" },
      { type: "REQUEST_CONTACT", reason: "второй" },
      { type: "TRANSFER_TO_MANAGER", reason: "просит человека", urgency: "normal" },
      { type: "TRANSFER_TO_MANAGER", reason: "повтор", urgency: "high" },
    ];

    const result = dedupeEffects(effects);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ type: "REQUEST_CONTACT", reason: "первый" });
  });
});