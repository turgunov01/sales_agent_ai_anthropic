# AI Sales Manager

Multi-tenant SaaS: AI-ассистент продаёт от имени бизнеса в Telegram — консультирует
по реальному каталогу, отвечает на русском и узбекском, квалифицирует лид, забирает
контакт и передаёт сделку менеджеру. Первый рынок — мебельные магазины Ташкента.

```
Клиент в Telegram  →  webhook  →  AI-агент (Claude + tools)  →  каталог и база знаний компании
                                        ↓
                              лид в CRM  →  менеджер в админке
```

## Что уже работает

| Возможность | Состояние |
|---|---|
| Регистрация компании, роли (владелец/админ/менеджер) | готово |
| Изоляция данных между компаниями (3 рубежа + тесты) | готово |
| Каталог: CRUD, фильтры, идемпотентный импорт CSV | готово |
| База знаний, FAQ, инструкции ассистенту | готово |
| AI-агент: 7 инструментов, RU/UZ, анти-галлюцинации, деградация | готово |
| Telegram: подключение бота, вебхук, текст/фото/голос/контакт | готово |
| CRM: лиды, скоринг, статусы, история событий, назначение | готово |
| Диалоги: инбокс, перехват менеджером, ответ в Telegram | готово |
| Админ-панель на Nuxt 4 | готово |
| Docker, Nginx, PM2, сид демо-данных | готово |
| Голосовая транскрипция, Instagram/WhatsApp, биллинг | вне MVP |

## Стек

**Backend** — Node.js 22, Express, TypeScript, PostgreSQL, Prisma, JWT, Zod
**Frontend** — Nuxt 4, Vue 3, TypeScript, Pinia, Tailwind CSS 4
**AI** — Claude API (tool calling), отдельный контекст для каждой компании
**Инфраструктура** — Docker, Nginx, PM2, Ubuntu VPS

## Быстрый старт

```bash
cp .env.example .env      # заполнить ANTHROPIC_API_KEY и ENCRYPTION_KEY
npm install
docker compose -f docker/docker-compose.yml up -d postgres
npm run db:migrate
npm run db:seed
npm run dev:api           # http://localhost:4000
npm run dev:web           # http://localhost:3000
```

Демо-вход после сида: `owner@mebelstyle.uz` / `Demo12345!`

Сгенерировать секреты:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"   # ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(48).toString('base64'))" # JWT_*_SECRET
```

## Подключение реального магазина

1. Владелец регистрируется на `/login` → «Зарегистрировать магазин».
2. **Каталог** → «Импорт CSV» → вставляет выгрузку (обязательна колонка `name`,
   `external_id` делает повторный импорт безопасным).
3. **База знаний** → адрес, график, доставка, оплата, гарантия, FAQ.
4. **Настройки** → Telegram → вставляет токен от `@BotFather`.
   `PUBLIC_WEBHOOK_URL` должен быть публичным HTTPS-адресом.
5. Клиент пишет боту → ассистент подбирает товары → берёт контакт →
   лид появляется в разделе **Лиды** со статусом `QUALIFIED`.

## Команды

```bash
npm run verify        # lint + typecheck + тесты
npm run lint          # ESLint по всему монорепозиторию
npm run typecheck     # tsc для API + vue-tsc для админки
npm run test          # 195 тестов Vitest (unit + integration)
npm run build         # сборка shared, api и web
npm run db:migrate    # применить миграции (dev)
npm run db:seed       # демо-компания и каталог
```

## Структура

```
apps/api        Express + Prisma, modular monolith
apps/web        Nuxt 4 admin dashboard
packages/shared типы и enum'ы, общие для API и админки
docker          Dockerfile'ы, compose, конфиг Nginx
docs            архитектура, API, AI, безопасность, roadmap
```

## Документация

Все архитектурные решения — в [`/docs`](docs/README.md):
[архитектура](docs/01-architecture.md) ·
[структура](docs/02-project-structure.md) ·
[модель данных](docs/03-data-model.md) ·
[API](docs/04-api-specification.md) ·
[AI](docs/05-ai-architecture.md) ·
[Telegram](docs/06-telegram-flow.md) ·
[безопасность](docs/07-security-model.md) ·
[roadmap](docs/08-roadmap-mvp.md) ·
[тестирование](docs/09-testing-strategy.md) ·
[эксплуатация](docs/10-operations.md)

## Лицензия

Проприетарный код. Все права защищены.