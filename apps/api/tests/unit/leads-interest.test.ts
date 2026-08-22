import { describe, expect, it } from "vitest";
import { MessageRole, MessageType } from "@ai-sales/shared";
import type { MessageEntity } from "../../src/domain/entities.js";
import { deriveInterestFromHistory } from "../../src/modules/leads/leads.interest.js";

let seq = 0;
function msg(role: MessageEntity["role"], content: string): MessageEntity {
  seq += 1;
  return {
    id: `msg_${seq}`,
    companyId: "cmp_1",
    conversationId: "cnv_1",
    role,
    type: MessageType.TEXT,
    content,
    attachments: null,
    toolCalls: null,
    tokensIn: null,
    tokensOut: null,
    createdAt: new Date(1_700_000_000_000 + seq * 1000),
  };
}

describe("deriveInterestFromHistory", () => {
  it("берёт первое содержательное сообщение клиента", () => {
    const result = deriveInterestFromHistory([
      msg(MessageRole.CUSTOMER, "Мне нужен диван до 8 млн, серый"),
      msg(MessageRole.ASSISTANT, "Подобрал варианты"),
      msg(MessageRole.CUSTOMER, "Хорошо"),
    ]);
    expect(result).toBe("Мне нужен диван до 8 млн, серый");
  });

  it("не считает интересом сообщение с контактом", () => {
    const result = deriveInterestFromHistory([
      msg(MessageRole.CUSTOMER, "Мой номер: +998901234567"),
      msg(MessageRole.CUSTOMER, "Нужен шкаф-купе"),
    ]);
    expect(result).toBe("Нужен шкаф-купе");
  });

  it("пропускает голое число телефона", () => {
    const result = deriveInterestFromHistory([
      msg(MessageRole.CUSTOMER, "+998 90 123 45 67"),
      msg(MessageRole.CUSTOMER, "Ищу кровать"),
    ]);
    expect(result).toBe("Ищу кровать");
  });

  it("пропускает служебные подстановки канала и команды", () => {
    const result = deriveInterestFromHistory([
      msg(MessageRole.CUSTOMER, "/start"),
      msg(MessageRole.CUSTOMER, "[Клиент отправил фото]"),
      msg(MessageRole.CUSTOMER, "Хочу такой же диван"),
    ]);
    expect(result).toBe("Хочу такой же диван");
  });

  it("не берёт сообщения ассистента и менеджера", () => {
    const result = deriveInterestFromHistory([
      msg(MessageRole.ASSISTANT, "Здравствуйте! Чем помочь?"),
      msg(MessageRole.MANAGER, "Отвечает менеджер"),
      msg(MessageRole.SYSTEM, "Менеджер подключился"),
    ]);
    expect(result).toBeNull();
  });

  it("обрезает слишком длинное сообщение", () => {
    const long = "диван ".repeat(100);
    const result = deriveInterestFromHistory([msg(MessageRole.CUSTOMER, long)]);
    expect(result).not.toBeNull();
    expect((result as string).length).toBeLessThanOrEqual(300);
  });

  it("возвращает null, когда брать нечего", () => {
    expect(deriveInterestFromHistory([])).toBeNull();
    expect(deriveInterestFromHistory([msg(MessageRole.CUSTOMER, "ок")])).toBeNull();
  });
});