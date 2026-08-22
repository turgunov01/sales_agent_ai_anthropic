# 04. Спецификация API

Базовый префикс: `/api/v1`. Формат — JSON. Аутентификация — `Authorization: Bearer <accessToken>`.

## 4.1. Конверт ответа

Успех:

```json
{ "success": true, "data": { }, "meta": { "page": 1, "limit": 20, "total": 57 } }
```

Ошибка:

```json
{
  "success": false,
  "error": { "code": "VALIDATION_ERROR", "message": "Некорректные данные", "details": [ ] },
  "requestId": "b3f1c0d2-..."
}
```

Коды ошибок: `VALIDATION_ERROR` (400), `UNAUTHORIZED` (401), `FORBIDDEN` (403),
`NOT_FOUND` (404), `CONFLICT` (409), `RATE_LIMITED` (429), `INTERNAL_ERROR` (500),
`AI_UNAVAILABLE` (503).

## 4.2. Аутентификация

| Метод | Путь | Доступ | Описание |
|---|---|---|---|
| POST | `/auth/register` | публичный | Регистрация компании + владельца |
| POST | `/auth/login` | публичный | Вход, выдаёт access + refresh |
| POST | `/auth/refresh` | публичный | Обмен refresh-токена (ротация) |
| POST | `/auth/logout` | публичный | Отзыв refresh-токена |
| GET | `/auth/me` | любой вход | Профиль + компания |

`POST /auth/register`

```json
{
  "companyName": "Mebel Style",
  "fullName": "Азиз Каримов",
  "email": "aziz@mebelstyle.uz",
  "password": "Str0ngPass!",
  "phone": "+998901234567"
}
```

Ответ: `{ user, company, tokens: { accessToken, refreshToken, expiresIn } }`.

## 4.3. Компания и база знаний

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/company` | любой | Профиль компании |
| PATCH | `/company` | OWNER, ADMIN | Название, телефон, язык по умолчанию |
| GET | `/company/knowledge` | любой | База знаний |
| PUT | `/company/knowledge` | OWNER, ADMIN | Обновление базы знаний |
| GET | `/company/faq` | любой | Список FAQ |
| POST | `/company/faq` | OWNER, ADMIN | Добавить вопрос |
| PATCH | `/company/faq/:id` | OWNER, ADMIN | Изменить |
| DELETE | `/company/faq/:id` | OWNER, ADMIN | Удалить |
| GET | `/company/ai-settings` | любой | Настройки AI |
| PUT | `/company/ai-settings` | OWNER, ADMIN | Имя ассистента, тон, инструкции, модель |

## 4.4. Сотрудники

| Метод | Путь | Роль |
|---|---|---|
| GET | `/employees` | любой |
| POST | `/employees` | OWNER, ADMIN |
| PATCH | `/employees/:id` | OWNER, ADMIN |
| DELETE | `/employees/:id` | OWNER |

Правила: нельзя удалить последнего `OWNER`; нельзя понизить самого себя;
`MANAGER` не управляет сотрудниками.

## 4.5. Каталог

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/products` | любой | Список: `q`, `category`, `minPrice`, `maxPrice`, `active`, `page`, `limit`, `sort` |
| POST | `/products` | OWNER, ADMIN | Создать товар |
| GET | `/products/:id` | любой | Карточка |
| PATCH | `/products/:id` | OWNER, ADMIN | Обновить |
| DELETE | `/products/:id` | OWNER, ADMIN | Мягкое удаление (`active=false`) |
| POST | `/products/import` | OWNER, ADMIN | Импорт CSV (`text/csv` или `{ "csv": "..." }`) |
| GET | `/products/categories` | любой | Список категорий компании |

CSV-формат импорта (заголовок обязателен):

```csv
external_id,name,description,category,price,currency,stock_status,images,material,color,width_cm,seats
SF-001,Диван «Милан»,Угловой диван,Диваны,7500000,UZS,IN_STOCK,https://cdn/1.jpg|https://cdn/2.jpg,Рогожка,Серый,280,4
```

Колонки вне известного списка попадают в `attributes` как есть.

## 4.6. Диалоги

| Метод | Путь | Описание |
|---|---|---|
| GET | `/conversations` | Список: `status`, `assignedUserId`, `page`, `limit` |
| GET | `/conversations/:id` | Диалог + клиент + связанный лид |
| GET | `/conversations/:id/messages` | История сообщений |
| POST | `/conversations/:id/messages` | Ответ менеджера (уходит в Telegram) |
| POST | `/conversations/:id/takeover` | Менеджер берёт диалог, AI отключается |
| POST | `/conversations/:id/release` | Вернуть диалог AI |
| POST | `/conversations/:id/close` | Закрыть диалог |

## 4.7. Лиды

| Метод | Путь | Описание |
|---|---|---|
| GET | `/leads` | Фильтры: `status`, `assignedManagerId`, `from`, `to`, `q` |
| GET | `/leads/:id` | Карточка + история событий |
| POST | `/leads` | Ручное создание |
| PATCH | `/leads/:id` | Контакт, интерес, бюджет, комментарий |
| POST | `/leads/:id/status` | Смена статуса с проверкой перехода |
| POST | `/leads/:id/assign` | Назначить менеджера |

## 4.8. Каналы

| Метод | Путь | Роль | Описание |
|---|---|---|---|
| GET | `/channels` | любой | Подключённые каналы (токен маскирован) |
| POST | `/channels/telegram` | OWNER, ADMIN | Подключить бота: `{ "botToken": "..." }` |
| POST | `/channels/telegram/verify` | OWNER, ADMIN | Проверить связь (`getMe`) и переустановить webhook |
| DELETE | `/channels/:id` | OWNER, ADMIN | Отключить канал и снять webhook |

## 4.9. Аналитика

`GET /analytics/overview?days=30` возвращает:

```json
{
  "leads": { "total": 42, "byStatus": { "NEW": 12, "QUALIFIED": 18, "CONTACTED": 7, "WON": 4, "LOST": 1 } },
  "conversations": { "total": 96, "active": 11, "handoffRequested": 2 },
  "messages": { "total": 1840, "byAssistant": 902 },
  "conversionRate": 0.095,
  "daily": [ { "date": "2026-08-01", "leads": 3, "conversations": 8 } ]
}
```

## 4.10. Вебхуки

`POST /webhooks/telegram/:channelId` — только для Telegram. Проверяется заголовок
`X-Telegram-Bot-Api-Secret-Token`. Ответ всегда `200 OK` и пустое тело; ошибки
логируются, но не возвращаются (иначе Telegram уходит в бесконечный retry).

## 4.11. Служебное

- `GET /health` — liveness (без БД).
- `GET /health/ready` — readiness (проверяет БД).