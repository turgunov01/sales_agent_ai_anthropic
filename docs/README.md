# AI Sales Manager — документация

Платформа: multi-tenant SaaS, в котором AI-ассистент продаёт от имени бизнеса
(первый рынок — мебельные магазины Ташкента), общается с клиентами в Telegram,
консультирует по реальному каталогу, квалифицирует лид и передаёт сделку менеджеру.

## Карта документов

| Документ | О чём |
|---|---|
| [01-architecture.md](01-architecture.md) | Архитектура системы, контуры, потоки данных, решения |
| [02-project-structure.md](02-project-structure.md) | Структура директорий и правила модульности |
| [03-data-model.md](03-data-model.md) | Модель данных, Prisma schema, изоляция арендаторов |
| [04-api-specification.md](04-api-specification.md) | REST API: эндпоинты, контракты, коды ошибок |
| [05-ai-architecture.md](05-ai-architecture.md) | AI-агент: промпт, tools, анти-галлюцинации, языки |
| [06-telegram-flow.md](06-telegram-flow.md) | Telegram: подключение бота, webhook, обработка сообщений |
| [07-security-model.md](07-security-model.md) | Аутентификация, авторизация, шифрование, лимиты |
| [08-roadmap-mvp.md](08-roadmap-mvp.md) | Дорожная карта MVP, критерии готовности |
| [09-testing-strategy.md](09-testing-strategy.md) | Стратегия тестирования и проверки качества |
| [10-operations.md](10-operations.md) | Развёртывание: Docker, Nginx, PM2, Ubuntu VPS |
| [adr/](adr/) | Architecture Decision Records |

## Главный критерий MVP

Реальный мебельный магазин самостоятельно:

1. регистрируется и создаёт компанию;
2. подключает своего Telegram-бота (вставляет токен);
3. загружает каталог (CSV или через UI);
4. заполняет базу знаний (адрес, график, доставка, оплата, гарантия, FAQ);
5. получает первого квалифицированного лида без участия менеджера.