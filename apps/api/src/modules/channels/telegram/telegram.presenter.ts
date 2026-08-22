import { Language, StockStatus } from "@ai-sales/shared";
import { formatPrice } from "../../../core/utils/numbers.js";
import { truncate } from "../../../core/utils/text.js";
import type { ProductEntity } from "../../../domain/entities.js";

const STOCK_LABELS: Record<Language, Record<StockStatus, string>> = {
  RU: {
    IN_STOCK: "В наличии",
    OUT_OF_STOCK: "Нет в наличии",
    ON_ORDER: "Под заказ",
  },
  UZ: {
    IN_STOCK: "Mavjud",
    OUT_OF_STOCK: "Mavjud emas",
    ON_ORDER: "Buyurtma asosida",
  },
};

const ATTRIBUTE_LABELS: Record<string, string> = {
  material: "Материал",
  color: "Цвет",
  width_cm: "Ширина, см",
  depth_cm: "Глубина, см",
  height_cm: "Высота, см",
  seats: "Мест",
  mechanism: "Механизм",
  style: "Стиль",
};

export const CONTACT_BUTTON_LABEL: Record<Language, string> = {
  RU: "📱 Отправить мой номер",
  UZ: "📱 Raqamimni yuborish",
};

export const CONTACT_PROMPT: Record<Language, string> = {
  RU: "Нажмите кнопку ниже, чтобы отправить номер — менеджер свяжется с вами.",
  UZ: "Raqamingizni yuborish uchun quyidagi tugmani bosing — menejer siz bilan bog'lanadi.",
};

export const HANDOFF_NOTICE: Record<Language, string> = {
  RU: "Передаю диалог менеджеру — он ответит вам здесь же.",
  UZ: "Suhbatni menejerga uzatyapman — u shu yerda javob beradi.",
};

/** Карточка товара для мессенджера: без markdown, чтобы не ломаться на спецсимволах. */
export function formatProductCard(product: ProductEntity, language: Language): string {
  const lines: string[] = [`🛋 ${product.name}`, formatPrice(product.price, product.currency)];

  const details = Object.entries(product.attributes)
    .slice(0, 5)
    .map(([key, value]) => `${ATTRIBUTE_LABELS[key] ?? key}: ${value}`);
  if (details.length > 0) lines.push(details.join(", "));

  if (product.description) lines.push(truncate(product.description, 200));

  lines.push(STOCK_LABELS[language][product.stockStatus]);
  return lines.join("\n");
}