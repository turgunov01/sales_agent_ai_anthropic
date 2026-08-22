# 02. Структура проекта

```
ai_manager_sass/
├─ apps/
│  ├─ api/                          # Express + Prisma (modular monolith)
│  │  ├─ prisma/
│  │  │  ├─ schema.prisma
│  │  │  └─ seed.ts                 # демо-компания «Mebel Style» + каталог
│  │  ├─ src/
│  │  │  ├─ main.ts                 # bootstrap процесса, graceful shutdown
│  │  │  ├─ app.ts                  # сборка Express-приложения
│  │  │  ├─ container.ts            # композиция зависимостей (DI)
│  │  │  ├─ routes.ts               # монтирование модулей на /api/v1
│  │  │  ├─ config/env.ts           # Zod-валидация переменных окружения
│  │  │  ├─ core/
│  │  │  │  ├─ errors.ts            # AppError + фабрики + TenantScopeError
│  │  │  │  ├─ logger.ts            # pino с redact-списком
│  │  │  │  ├─ prisma.ts            # guarded и tenant-resolution клиенты
│  │  │  │  ├─ tenant-guard.ts      # чистая проверка скоупа companyId
│  │  │  │  ├─ http/                # respond, async-handler, error-handler,
│  │  │  │  │                       # request-context, validate
│  │  │  │  ├─ security/            # password (scrypt), tokens (JWT),
│  │  │  │  │                       # crypto (AES-256-GCM), rate-limit
│  │  │  │  ├─ queue/               # in-process-queue
│  │  │  │  └─ utils/               # amount, numbers, phone, text
│  │  │  ├─ domain/
│  │  │  │  ├─ entities.ts          # доменные сущности (без Prisma и Decimal)
│  │  │  │  └─ repositories.ts      # порты доступа к данным
│  │  │  ├─ infra/prisma/           # реализация портов поверх Prisma
│  │  │  │  ├─ mappers.ts           # строка БД → доменная сущность
│  │  │  │  └─ *.repository.ts
│  │  │  └─ modules/
│  │  │     ├─ shared/mappers.ts    # доменная сущность → DTO
│  │  │     ├─ auth/                # регистрация, вход, refresh, middleware
│  │  │     ├─ employees/           # сотрудники и роли
│  │  │     ├─ company/             # профиль, база знаний, FAQ, AI-настройки
│  │  │     ├─ products/            # каталог, CSV-импорт, поиск
│  │  │     ├─ conversations/       # диалоги, сообщения, перехват менеджером
│  │  │     ├─ leads/               # CRM: скоринг, статусы, события
│  │  │     ├─ analytics/           # метрики дашборда
│  │  │     ├─ health/              # liveness и readiness
│  │  │     ├─ ai/
│  │  │     │  ├─ agent.service.ts  # цикл tool-use
│  │  │     │  ├─ prompt.builder.ts # сборка system prompt
│  │  │     │  ├─ llm.client.ts     # порт модели (LlmClient)
│  │  │     │  ├─ language.ts       # определение RU/UZ
│  │  │     │  └─ tools/            # definitions.ts, executor.ts
│  │  │     └─ channels/
│  │  │        ├─ channels.service.ts   # подключение и проверка канала
│  │  │        ├─ webhook.routes.ts     # приём апдейтов Telegram
│  │  │        └─ telegram/             # transport, dispatcher, presenter, types
│  │  └─ tests/
│  │     ├─ unit/                   # 8 файлов: guard, security, язык, скоринг,
│  │     │                          # CSV, утилиты, промпт, инструменты, транспорт
│  │     ├─ integration/            # auth, изоляция, каталог, лиды, компания,
│  │     │                          # полный путь Telegram
│  │     ├─ helpers/                # fake-store, fake-llm, fake-telegram, test-app
│  │     └─ setup.ts                # переменные окружения для тестов
│  └─ web/                          # Nuxt 4 admin dashboard (SPA)
│     ├─ app/
│     │  ├─ app.vue
│     │  ├─ assets/css/main.css     # дизайн-токены и компоненты
│     │  ├─ components/             # AppSidebar, StatTile, StatusPill, …
│     │  ├─ composables/useApi.ts   # клиент API с обновлением токена
│     │  ├─ layouts/                # default (сайдбар), blank (вход)
│     │  ├─ middleware/auth.global.ts
│     │  ├─ pages/                  # index, login, leads, conversations,
│     │  │                          # products, knowledge, settings
│     │  ├─ stores/auth.ts          # Pinia
│     │  └─ utils/format.ts
│     └─ nuxt.config.ts
├─ packages/
│  └─ shared/src/                   # enums.ts, api.ts, dto.ts
├─ docker/                          # api/web Dockerfile, compose, nginx
├─ docs/                            # архитектурная документация
├─ ecosystem.config.cjs             # PM2
└─ eslint.config.js                 # общий flat-config
```

## Правила модульности

1. **Модуль = папка.** Внутри: `*.routes.ts`, `*.service.ts`, `*.schema.ts` (Zod),
   при необходимости `*.controller.ts`. Доступ к данным — только через порт
   из `domain/repositories.ts`.
2. **Направление импорта — вниз:** `routes → controller → service → repository port → core`.
   Кросс-модульные вызовы допустимы только на уровне `service → service`.
3. **Файл ≤ 400 строк, функция ≤ 50 строк.**
4. **Ни один сервис не импортирует `@prisma/client`.** Сервисы работают с
   доменными сущностями, поэтому Prisma-реализацию можно подменить фейком.
5. **DTO ≠ сущность БД.** `passwordHash`, `botTokenCiphertext`, `webhookSecret`
   не покидают сервер: наружу идут только объекты из `modules/shared/mappers.ts`.
6. **Композиция — в одном месте.** Все зависимости связываются в `container.ts`;
   тесты подменяют репозитории, клиент модели и транспорт Telegram там же.