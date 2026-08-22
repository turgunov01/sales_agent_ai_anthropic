# 03. Модель данных

Источник правды — [apps/api/prisma/schema.prisma](../apps/api/prisma/schema.prisma).

## 3.1. Границы арендатора

Модели делятся на три группы:

| Группа | Модели | Правило доступа |
|---|---|---|
| Корень арендатора | `Company` | Доступ только по `id` из JWT |
| Данные арендатора | `User`, `Product`, `KnowledgeBase`, `FaqItem`, `AiSettings`, `Channel`, `Customer`, `Conversation`, `Message`, `Lead`, `LeadEvent` | Обязателен `companyId` в `where`/`data` |
| Глобальные | `Session` | Скоуп по `userId`, не по компании |

`Session` намеренно не содержит `companyId`: сессия принадлежит пользователю, а
пользователь — компании. Guard-расширение Prisma знает этот список и отклоняет
любой запрос к модели арендатора без `companyId` (`TenantScopeError`).

## 3.2. Ключевые сущности

### Product

```
id, companyId, externalId?, name, description?, category?,
price Decimal(14,2), currency (UZS|USD), images String[],
attributes Json, stockStatus (IN_STOCK|OUT_OF_STOCK|ON_ORDER),
active, createdAt, updatedAt
```

- `externalId` — артикул магазина; уникален в пределах компании, служит ключом
  идемпотентного импорта (повторная загрузка CSV обновляет, а не дублирует).
- `attributes` — свободный JSON под категорию. Для мебели: `material`,
  `color`, `widthCm`, `depthCm`, `heightCm`, `seats`, `mechanism`, `style`.
  AI получает атрибуты как есть и использует их в уточняющих вопросах.
- `price` хранится Decimal, наружу отдаётся числом (маппер в репозитории).

### Lead

```
id, companyId, customerId, conversationId?, name?, phone?, telegramUserId?,
source, interest?, budgetMin?, budgetMax?, currency, status,
aiSummary?, qualificationScore, interestedProductIds String[],
assignedManagerId?, createdAt, updatedAt, contactedAt?, closedAt?
```

Переходы статусов (проверяются в `LeadsService`):

```
NEW ──▶ QUALIFIED ──▶ CONTACTED ──▶ WON
 │           │             │
 └───────────┴─────────────┴────▶ LOST
```

- Из `WON`/`LOST` переходы запрещены (терминальные состояния).
- Любой переход пишет `LeadEvent` — это аудит и основа для аналитики.
- `qualificationScore` (0..100) считается детерминированно из заполненности:
  контакт, интерес, бюджет, привязка к товарам, намерение купить.

### Conversation / Message

Диалог — непрерывная сессия с клиентом в канале. Новый диалог создаётся, если
предыдущий закрыт или неактивен дольше `CONVERSATION_IDLE_HOURS` (24 ч).
`Message.role` различает `CUSTOMER`, `ASSISTANT` (AI), `MANAGER` (человек) и
`SYSTEM` (события: передача менеджеру, смена статуса).

### Channel

Хранит зашифрованный токен бота (`botTokenCiphertext`, AES-256-GCM) и
`webhookSecret` — случайную строку, которую Telegram присылает в заголовке
`X-Telegram-Bot-Api-Secret-Token`. Токен бота никогда не отдаётся в API-ответах;
наружу идёт только маскированное представление (`123456:AAE***`).

## 3.3. Индексы

Индексы подобраны под фактические запросы дашборда и агента:

| Индекс | Запрос |
|---|---|
| `products(companyId, active)` | список каталога |
| `products(companyId, category)` | фильтр по категории в `search_products` |
| `products(companyId, price)` | фильтр «до 8 млн» |
| `leads(companyId, status, createdAt)` | воронка и «новые лиды» |
| `conversations(companyId, status, lastMessageAt)` | инбокс диалогов |
| `messages(conversationId, createdAt)` | загрузка истории окном |
| `customers(companyId, channelType, externalId)` | upsert по Telegram ID |

## 3.4. Миграции

Начальная миграция уже в репозитории:
`apps/api/prisma/migrations/20260822000000_init/migration.sql`
(12 enum-типов, 13 таблиц, 23 индекса, 21 внешний ключ).

```bash
npm run db:migrate    # dev: создать и применить миграцию
npm run db:deploy     # prod: применить существующие миграции
npm run db:seed       # демо-компания и каталог для проверки сценария
```

Правила: миграции только вперёд, каждая — отдельный коммит, удаление колонок
делается в два шага (сначала перестать писать, потом удалить).