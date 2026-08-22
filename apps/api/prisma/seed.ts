import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/core/security/password.js";

/**
 * Демо-данные для проверки основного сценария MVP:
 * мебельный магазин в Ташкенте с каталогом, базой знаний и FAQ.
 * Скрипт идемпотентен — повторный запуск обновляет, а не дублирует.
 */
const prisma = new PrismaClient();

const COMPANY_SLUG = "mebel-style";
const OWNER_EMAIL = "owner@mebelstyle.uz";
const MANAGER_EMAIL = "manager@mebelstyle.uz";
const DEMO_PASSWORD = "Demo12345!";

interface SeedProduct {
  externalId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stockStatus: "IN_STOCK" | "OUT_OF_STOCK" | "ON_ORDER";
  images: string[];
  attributes: Record<string, string | number>;
}

const PRODUCTS: SeedProduct[] = [
  {
    externalId: "SF-001",
    name: "Диван «Милан»",
    description: "Угловой диван с механизмом «еврокнижка» и ящиком для белья",
    category: "Диваны",
    price: 7_500_000,
    stockStatus: "IN_STOCK",
    images: ["https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=900"],
    attributes: { material: "Рогожка", color: "Серый", width_cm: 280, seats: 4, mechanism: "Еврокнижка" },
  },
  {
    externalId: "SF-002",
    name: "Диван «Осло»",
    description: "Прямой трёхместный диван в скандинавском стиле",
    category: "Диваны",
    price: 5_900_000,
    stockStatus: "IN_STOCK",
    images: ["https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?w=900"],
    attributes: { material: "Велюр", color: "Бежевый", width_cm: 220, seats: 3, style: "Скандинавский" },
  },
  {
    externalId: "SF-003",
    name: "Диван «Прага»",
    description: "Модульный диван с реклайнером и приставным пуфом",
    category: "Диваны",
    price: 9_800_000,
    stockStatus: "ON_ORDER",
    images: [],
    attributes: { material: "Экокожа", color: "Чёрный", width_cm: 320, seats: 5, mechanism: "Реклайнер" },
  },
  {
    externalId: "SF-004",
    name: "Диван «Токио»",
    description: "Компактный двухместный диван для небольшой гостиной",
    category: "Диваны",
    price: 4_200_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Шенилл", color: "Синий", width_cm: 165, seats: 2 },
  },
  {
    externalId: "SF-005",
    name: "Диван-кровать «Смарт»",
    description: "Раскладывается в полноценное спальное место 200×140",
    category: "Диваны",
    price: 6_400_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Рогожка", color: "Тёмно-серый", width_cm: 210, seats: 3, mechanism: "Аккордеон" },
  },
  {
    externalId: "WD-001",
    name: "Шкаф-купе «Токио»",
    description: "Двухдверный шкаф-купе с зеркалом",
    category: "Шкафы",
    price: 4_200_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "ЛДСП", color: "Венге", width_cm: 180, height_cm: 240 },
  },
  {
    externalId: "WD-002",
    name: "Шкаф «Милан»",
    description: "Трёхдверный распашной шкаф с антресолью",
    category: "Шкафы",
    price: 5_600_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "МДФ", color: "Белый", width_cm: 220, height_cm: 250 },
  },
  {
    externalId: "BD-001",
    name: "Кровать «Верона»",
    description: "Двуспальная кровать с мягким изголовьем и подъёмным механизмом",
    category: "Кровати",
    price: 6_900_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Велюр", color: "Мятный", width_cm: 180, mechanism: "Подъёмный" },
  },
  {
    externalId: "BD-002",
    name: "Кровать «Осака»",
    description: "Кровать в минималистичном стиле с реечным основанием",
    category: "Кровати",
    price: 4_800_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Массив дуба", color: "Натуральный", width_cm: 160 },
  },
  {
    externalId: "TB-001",
    name: "Стол обеденный «Норд»",
    description: "Раздвижной стол на 6–8 персон",
    category: "Столы",
    price: 3_400_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Массив бука", color: "Орех", width_cm: 160 },
  },
  {
    externalId: "TB-002",
    name: "Стол журнальный «Лофт»",
    description: "Журнальный столик со стеклянной столешницей",
    category: "Столы",
    price: 1_250_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Металл и стекло", color: "Чёрный", width_cm: 110 },
  },
  {
    externalId: "CH-001",
    name: "Кресло «Ретро»",
    description: "Мягкое кресло с деревянными подлокотниками",
    category: "Кресла",
    price: 2_300_000,
    stockStatus: "IN_STOCK",
    images: [],
    attributes: { material: "Велюр", color: "Горчичный", width_cm: 78, seats: 1 },
  },
];

const FAQ = [
  {
    question: "Есть ли доставка по Ташкенту?",
    answer: "Да. Доставка по Ташкенту бесплатная при заказе от 5 000 000 сум, иначе 150 000 сум.",
  },
  {
    question: "Можно ли купить в рассрочку?",
    answer: "Да, рассрочка до 12 месяцев без переплаты при первоначальном взносе 30%.",
  },
  {
    question: "Сколько ждать изготовление под заказ?",
    answer: "Мебель под заказ изготавливается 14–21 рабочий день.",
  },
  {
    question: "Есть ли подъём на этаж?",
    answer: "Подъём до 5 этажа бесплатный, выше — 50 000 сум за этаж.",
  },
  {
    question: "Можно ли посмотреть мебель вживую?",
    answer: "Да, шоурум работает Пн–Сб с 10:00 до 20:00 по адресу Ташкент, Чиланзар, ул. Бунёдкор 12.",
  },
];

async function main(): Promise<void> {
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const company = await prisma.company.upsert({
    where: { slug: COMPANY_SLUG },
    create: {
      name: "Mebel Style",
      slug: COMPANY_SLUG,
      phone: "+998901234567",
      defaultLanguage: "RU",
    },
    update: { name: "Mebel Style", phone: "+998901234567" },
  });

  await prisma.user.upsert({
    where: { email: OWNER_EMAIL },
    create: {
      companyId: company.id,
      email: OWNER_EMAIL,
      passwordHash,
      fullName: "Азиз Каримов",
      role: "OWNER",
    },
    update: { passwordHash },
  });

  await prisma.user.upsert({
    where: { email: MANAGER_EMAIL },
    create: {
      companyId: company.id,
      email: MANAGER_EMAIL,
      passwordHash,
      fullName: "Малика Юсупова",
      role: "MANAGER",
    },
    update: { passwordHash },
  });

  await prisma.knowledgeBase.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      about: "Mebel Style — салон корпусной и мягкой мебели в Ташкенте. Работаем с 2016 года, свой цех и шоурум.",
      address: "Ташкент, Чиланзарский район, ул. Бунёдкор, 12",
      workingHours: "Пн–Сб 10:00–20:00, Вс — выходной",
      delivery: "По Ташкенту бесплатно от 5 000 000 сум, иначе 150 000 сум. По области — по договорённости.",
      payment: "Наличные, карта UzCard/Humo, перечисление, рассрочка до 12 месяцев.",
      warranty: "Гарантия 18 месяцев на каркас и механизмы, 12 месяцев на обивку.",
      managerInstructions: "Всегда уточняй размеры комнаты и предлагай бесплатный замер.",
    },
    update: {},
  });

  await prisma.aiSettings.upsert({
    where: { companyId: company.id },
    create: {
      companyId: company.id,
      assistantName: "Малика",
      tone: "Тёплый, вежливый, без навязчивости",
      systemInstructions:
        "Предлагай бесплатный замер. Если клиент сомневается — приглашай в шоурум. Не обещай скидок.",
      model: "claude-sonnet-5",
    },
    update: {},
  });

  for (const [index, item] of FAQ.entries()) {
    const existing = await prisma.faqItem.findFirst({
      where: { companyId: company.id, question: item.question },
    });
    if (existing) continue;
    await prisma.faqItem.create({
      data: { companyId: company.id, position: index, ...item },
    });
  }

  for (const product of PRODUCTS) {
    await prisma.product.upsert({
      where: { companyId_externalId: { companyId: company.id, externalId: product.externalId } },
      create: { companyId: company.id, currency: "UZS", active: true, ...product },
      update: { ...product },
    });
  }

  console.log("Демо-данные загружены.");
  console.log(`  Компания: ${company.name} (${company.slug})`);
  console.log(`  Владелец: ${OWNER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Менеджер: ${MANAGER_EMAIL} / ${DEMO_PASSWORD}`);
  console.log(`  Товаров: ${PRODUCTS.length}, вопросов в FAQ: ${FAQ.length}`);
}

main()
  .catch((error: unknown) => {
    console.error("Сид завершился ошибкой:", error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });