import { MessageRole } from "@ai-sales/shared";
import { truncate } from "../../core/utils/text.js";
import type { MessageEntity } from "../../domain/entities.js";

const MAX_INTEREST_LENGTH = 300;
const MIN_MEANINGFUL_LENGTH = 3;

/** Служебные тексты, которые сам же канал и подставил вместо содержимого. */
const PLACEHOLDER = /^\[/;
/** Сообщение с контактом: «Мой номер: +998...» — это не описание потребности. */
const CONTACT_MESSAGE = /^мой номер:/i;
/** Сообщение, состоящее только из номера телефона. */
const PHONE_ONLY = /^[+\d][\d\s\-()]{6,}$/;
/** Команды бота. */
const COMMAND = /^\//;

function isMeaningful(content: string): boolean {
  const text = content.trim();
  if (text.length < MIN_MEANINGFUL_LENGTH) return false;
  if (PLACEHOLDER.test(text)) return false;
  if (CONTACT_MESSAGE.test(text)) return false;
  if (PHONE_ONLY.test(text)) return false;
  if (COMMAND.test(text)) return false;
  return true;
}

/**
 * Подстраховка на случай, когда модель не вызвала create_lead: интерес берём
 * из первого содержательного сообщения клиента. Без этого лид с телефоном
 * остаётся в статусе NEW и менеджер не понимает, чего человек хотел.
 */
export function deriveInterestFromHistory(messages: MessageEntity[]): string | null {
  const first = messages
    .filter((message) => message.role === MessageRole.CUSTOMER)
    .map((message) => message.content)
    .find(isMeaningful);

  return first ? truncate(first.trim(), MAX_INTEREST_LENGTH) : null;
}