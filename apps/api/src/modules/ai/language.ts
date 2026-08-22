import { Language } from "@ai-sales/shared";

/** Буквы, которых нет в русском: однозначный признак узбекской кириллицы. */
const UZ_CYRILLIC_LETTERS = /[ўқғҳ]/i;

const UZ_MARKERS = [
  "kerak", "narx", "narxi", "qancha", "qanchа", "bormi", "bor", "salom", "rahmat",
  "yaxshi", "olmoqchi", "olmoqchiman", "istayman", "qanday", "mavjud", "xona",
  "rang", "olcham", "o'lcham", "oʻlcham", "divan", "kreslo", "stol", "stul",
  "shkaf", "karavot", "necha", "nechta", "arzon", "qimmat", "yetkazib", "berish",
  "kafolat", "manzil", "ish", "vaqti", "toʻlov", "tolov", "menga", "sizda",
  "керак", "нарх", "нархи", "канча", "қанча", "борми", "салом", "рахмат", "раҳмат",
  "яхши", "олмокчиман", "қандай", "мавжуд", "хона", "ранг", "ўлчам", "арзон",
];

const RU_MARKERS = [
  "нужен", "нужна", "нужно", "сколько", "цена", "цены", "стоит", "стоимость",
  "есть", "хочу", "какой", "какая", "размер", "цвет", "доставка", "гарантия",
  "оплата", "адрес", "здравствуйте", "привет", "спасибо", "диван", "кресло",
  "шкаф", "кровать", "стол", "стул", "дешевле", "дороже", "рассрочка", "скидка",
];

function countMarkers(haystack: string, markers: string[]): number {
  let hits = 0;
  for (const marker of markers) {
    if (haystack.includes(marker)) hits += 1;
  }
  return hits;
}

/**
 * Детерминированное определение языка сообщения — без обращения к модели.
 * Порядок проверок: уникальные буквы → маркеры → преобладание алфавита → fallback.
 */
export function detectLanguage(text: string, fallback: Language = Language.RU): Language {
  const normalized = text.toLowerCase();

  if (UZ_CYRILLIC_LETTERS.test(normalized)) return Language.UZ;

  const cyrillic = (normalized.match(/[а-яёўқғҳ]/g) ?? []).length;
  const latin = (normalized.match(/[a-z]/g) ?? []).length;
  const letters = cyrillic + latin;
  if (letters === 0) return fallback;

  const uzHits = countMarkers(normalized, UZ_MARKERS);
  const ruHits = countMarkers(normalized, RU_MARKERS);

  if (uzHits > ruHits) return Language.UZ;
  if (ruHits > uzHits) return Language.RU;

  // Маркеров нет или ничья: решает алфавит. Латиница у нас — узбекская.
  if (latin / letters > 0.6) return Language.UZ;
  if (cyrillic / letters > 0.6) return Language.RU;

  return fallback;
}