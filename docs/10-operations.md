# 10. Эксплуатация

## 10.1. Локальный запуск

```bash
cp .env.example .env          # заполнить ANTHROPIC_API_KEY и ENCRYPTION_KEY
docker compose -f docker/docker-compose.yml up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev:api               # http://localhost:4000
npm run dev:web               # http://localhost:3000
```

Демо-вход после сида: `owner@mebelstyle.uz` / `Demo12345!`.

## 10.2. Продакшн на Ubuntu VPS

Минимальная конфигурация: 2 vCPU, 4 ГБ RAM, 40 ГБ SSD.

```bash
# 1. Зависимости
sudo apt update && sudo apt install -y nginx postgresql-16 git curl
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
sudo npm i -g pm2

# 2. Код и сборка
git clone <repo> /opt/ai-sales && cd /opt/ai-sales
cp .env.example .env && nano .env
npm ci && npm run build

# 3. База
npm run db:deploy

# 4. Процессы
pm2 start ecosystem.config.cjs --env production
pm2 save && pm2 startup

# 5. Nginx + TLS
sudo cp docker/nginx/ai-sales.conf /etc/nginx/sites-available/ai-sales
sudo ln -s /etc/nginx/sites-available/ai-sales /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d api.example.uz -d app.example.uz
```

После получения сертификата обязательно задать `PUBLIC_WEBHOOK_URL=https://api.example.uz`
и переподключить каналы (`POST /channels/telegram/verify`) — Telegram принимает
webhook только по HTTPS.

## 10.3. Вариант с Docker

```bash
docker compose -f docker/docker-compose.yml up -d --build
```

Поднимает `postgres`, `api`, `web`, `nginx`. Миграции применяются командой
`docker compose exec api npm run db:deploy`.

## 10.4. Наблюдаемость

- `GET /health` — liveness для PM2/Docker healthcheck.
- `GET /health/ready` — readiness, проверяет соединение с БД.
- Логи: `pm2 logs ai-sales-api` либо `docker compose logs -f api`.
- Каждая ошибка содержит `requestId`, который виден и клиенту, и в логе.

## 10.5. Известные предупреждения (не ошибки)

| Сообщение | Причина | Действие |
|---|---|---|
| `[Vue] Resolve plugin path failed: vue-router/volar/sfc-route-blocks` при `nuxt typecheck` | Nuxt прописывает volar-плагин, который vue-router 4.6 больше не экспортирует. Блоки `<route>` в проекте не используются | Игнорировать: `nuxt typecheck` завершается кодом 0 |
| `warn The configuration property package.json#prisma is deprecated` | Prisma 6 предупреждает о формате конфигурации Prisma 7 | Учесть при апгрейде до Prisma 7 |
| ESLint: `complexity` в `mappers.ts`, `csv.ts`, `leads.service.ts` | Счётчик считает цепочки `??` ветвлениями | Оставлено как предупреждение: разбивать маппинг на функции ради счётчика вредно для читаемости |

## 10.6. Резервное копирование

```bash
pg_dump -Fc ai_sales > /var/backups/ai_sales_$(date +%F).dump
```

Хранить 14 дней. Проверять восстановление раз в месяц: без проверки бэкапа нет.

## 10.7. Обновление

```bash
git pull && npm ci && npm run build && npm run db:deploy && pm2 reload ecosystem.config.cjs
```

`pm2 reload` перезапускает без простоя. Миграции пишутся совместимыми с
предыдущей версией кода (сначала добавляем, потом переключаем, потом удаляем).