-- Один Telegram-бот принадлежит только одной компании.
-- Отключение канала обнуляет botExternalId, освобождая бота.
CREATE UNIQUE INDEX "channels_botExternalId_key" ON "channels"("botExternalId");
