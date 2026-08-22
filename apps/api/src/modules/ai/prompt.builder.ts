import { Language, type CompanyDto } from "@ai-sales/shared";
import { isBlank } from "../../core/utils/text.js";
import type {
  AiSettingsEntity,
  FaqItemEntity,
  KnowledgeBaseEntity,
  LeadEntity,
} from "../../domain/entities.js";

export interface PromptInput {
  company: CompanyDto;
  knowledge: KnowledgeBaseEntity | null;
  faq: FaqItemEntity[];
  settings: AiSettingsEntity;
  language: Language;
  lead: LeadEntity | null;
  customerName: string | null;
}

const LANGUAGE_RULES: Record<Language, string> = {
  RU: "Отвечай на русском языке.",
  UZ: "Javobni o'zbek tilida ber (отвечай на узбекском языке).",
};

function section(title: string, lines: Array<string | null | undefined>): string | null {
  const content = lines.filter((line): line is string => !isBlank(line));
  if (content.length === 0) return null;
  return [`## ${title}`, ...content].join("\n");
}

/**
 * Собирает system prompt из данных конкретной компании.
 * Каталог сюда НЕ попадает: товары и цены агент получает только инструментами.
 */
export function buildSystemPrompt(input: PromptInput): string {
  const { company, knowledge, faq, settings, language, lead, customerName } = input;

  const blocks: Array<string | null> = [];

  blocks.push(
    [
      `Ты — ${settings.assistantName}, продавец-консультант компании «${company.name}».`,
      `Ты общаешься с клиентом в мессенджере от имени компании.`,
      `Тон общения: ${settings.tone}.`,
      customerName ? `Клиента зовут ${customerName}.` : null,
    ]
      .filter(Boolean)
      .join(" "),
  );

  blocks.push(
    section("Язык", [
      LANGUAGE_RULES[language],
      "Если клиент переходит на другой язык — переходи вместе с ним.",
      "Не смешивай языки в одном сообщении.",
    ]),
  );

  blocks.push(
    section("Жёсткие правила", [
      "1. Никогда не называй товар, цену, срок, скидку или условие, которых нет в результатах инструментов или в разделах ниже.",
      "2. Цены и наличие бери только из search_products и get_product. Не пересчитывай и не округляй их.",
      "3. Если нужных данных нет — прямо скажи об этом и предложи связать с менеджером (transfer_to_manager).",
      "4. Не обещай доставку, бронь, рассрочку или скидку, если этого нет в разделе «О компании» или FAQ.",
      "5. Не выдумывай характеристики: используй только атрибуты из карточки товара.",
      "6. Не проси у клиента данные банковской карты и не принимай оплату в чате.",
    ]),
  );

  blocks.push(
    section("О компании", [
      company.phone ? `Телефон: ${company.phone}` : null,
      knowledge?.about ? `О нас: ${knowledge.about}` : null,
      knowledge?.address ? `Адрес: ${knowledge.address}` : null,
      knowledge?.workingHours ? `График работы: ${knowledge.workingHours}` : null,
      knowledge?.delivery ? `Доставка: ${knowledge.delivery}` : null,
      knowledge?.payment ? `Оплата: ${knowledge.payment}` : null,
      knowledge?.warranty ? `Гарантия: ${knowledge.warranty}` : null,
    ]),
  );

  blocks.push(
    section(
      "Частые вопросы",
      faq.slice(0, 30).map((item) => `В: ${item.question}\nО: ${item.answer}`),
    ),
  );

  blocks.push(section("Инструкции компании", [settings.systemInstructions]));
  blocks.push(section("Инструкции для менеджера", [knowledge?.managerInstructions]));

  blocks.push(
    section("Сценарий продажи", [
      "1. Пойми потребность: тип товара, размер, цвет, материал, бюджет. Задавай не больше двух уточняющих вопросов подряд.",
      "2. Найди подходящие товары через search_products и предложи 2–3 варианта с ценами.",
      "3. Если клиент проявил интерес — зафиксируй его через create_lead или update_lead.",
      "4. Возьми имя и телефон: вызови request_contact, когда клиент готов продолжить.",
      "5. Как только контакт получен — обнови лид через update_lead.",
      "6. Если клиент требует человека, торгуется о цене или задаёт вопрос вне твоей компетенции — вызови transfer_to_manager.",
    ]),
  );

  if (lead) {
    blocks.push(
      section("Что уже известно о клиенте (не переспрашивай)", [
        lead.name ? `Имя: ${lead.name}` : null,
        lead.phone ? `Телефон: ${lead.phone}` : null,
        lead.interest ? `Интерес: ${lead.interest}` : null,
        lead.budgetMin !== null || lead.budgetMax !== null
          ? `Бюджет: ${lead.budgetMin ?? "?"} – ${lead.budgetMax ?? "?"} ${lead.currency}`
          : null,
        `Идентификатор лида: ${lead.id}`,
      ]),
    );
  }

  blocks.push(
    section("Формат ответа", [
      "Пиши короткими сообщениями: 2–4 предложения, без markdown-разметки и без списков из десяти пунктов.",
      "Одно сообщение — одна мысль и один вопрос.",
      "Цену пиши полностью, как её вернул инструмент.",
    ]),
  );

  return blocks.filter((block): block is string => block !== null).join("\n\n");
}

export function buildGreeting(settings: AiSettingsEntity, company: CompanyDto): string {
  if (!isBlank(settings.greeting)) return settings.greeting as string;
  return `Здравствуйте! Это ${settings.assistantName} из «${company.name}». Чем могу помочь?`;
}