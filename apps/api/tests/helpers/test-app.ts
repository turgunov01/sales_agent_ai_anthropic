import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { createContainer, type AppContainer } from "../../src/container.js";
import { InProcessQueue } from "../../src/core/queue/in-process-queue.js";
import { FakeLlmClient } from "./fake-llm.js";
import { FakeTelegramTransport } from "./fake-telegram.js";
import { FakeStore, createFakeRepositories } from "./fake-store.js";

export interface TestContext {
  app: Express;
  container: AppContainer;
  store: FakeStore;
  llm: FakeLlmClient;
  telegram: FakeTelegramTransport;
  queue: InProcessQueue;
}

/** Полное приложение с фейковыми внешними зависимостями: БД, модель, Telegram. */
export function createTestContext(): TestContext {
  const store = new FakeStore();
  const llm = new FakeLlmClient();
  const telegram = new FakeTelegramTransport();
  const queue = new InProcessQueue();

  const container = createContainer({
    repos: createFakeRepositories(store),
    llm,
    telegram,
    queue,
    now: () => store.now(),
  });

  const app = createApp({ container, checkDatabase: async () => true });
  return { app, container, store, llm, telegram, queue };
}

export interface RegisteredCompany {
  accessToken: string;
  refreshToken: string;
  companyId: string;
  userId: string;
  email: string;
}

export const DEMO_PASSWORD = "Demo12345!";

export async function registerCompany(
  app: Express,
  overrides: Partial<{ companyName: string; fullName: string; email: string; phone: string }> = {},
): Promise<RegisteredCompany> {
  const payload = {
    companyName: overrides.companyName ?? "Mebel Style",
    fullName: overrides.fullName ?? "Азиз Каримов",
    email: overrides.email ?? "owner@mebelstyle.uz",
    password: DEMO_PASSWORD,
    phone: overrides.phone ?? "+998901234567",
  };

  const response = await request(app).post("/api/v1/auth/register").send(payload);
  if (response.status !== 201) {
    throw new Error(`Регистрация не удалась: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return {
    accessToken: response.body.data.tokens.accessToken,
    refreshToken: response.body.data.tokens.refreshToken,
    companyId: response.body.data.company.id,
    userId: response.body.data.user.id,
    email: payload.email,
  };
}

export function auth(token: string): { Authorization: string } {
  return { Authorization: `Bearer ${token}` };
}

/** Подключает Telegram-канал и возвращает его вместе с секретом вебхука. */
export async function connectTelegram(
  context: TestContext,
  accessToken: string,
  botToken = "123456789:AAEhBOweik6ad9r_ZeuFRFF-DEMOtokenXYZ",
): Promise<{ channelId: string; webhookSecret: string; botToken: string }> {
  const response = await request(context.app)
    .post("/api/v1/channels/telegram")
    .set(auth(accessToken))
    .send({ botToken });

  if (response.status !== 201) {
    throw new Error(`Подключение канала не удалось: ${JSON.stringify(response.body)}`);
  }

  const channelId: string = response.body.data.id;
  const channel = context.store.channels.find((entry) => entry.id === channelId);
  if (!channel) throw new Error("Канал не сохранён в хранилище");

  return { channelId, webhookSecret: channel.webhookSecret, botToken };
}

export interface TelegramUpdateOptions {
  updateId?: number;
  userId?: number;
  chatId?: number;
  firstName?: string;
  contactPhone?: string;
}

export function telegramTextUpdate(
  text: string,
  options: TelegramUpdateOptions = {},
): Record<string, unknown> {
  const userId = options.userId ?? 555000111;
  const base = {
    update_id: options.updateId ?? Math.floor(Math.random() * 1_000_000),
    message: {
      message_id: options.updateId ?? 1,
      from: {
        id: userId,
        is_bot: false,
        first_name: options.firstName ?? "Дилшод",
        username: "dilshod",
      },
      chat: { id: options.chatId ?? userId, type: "private" },
      date: 1755855600,
      ...(options.contactPhone
        ? { contact: { phone_number: options.contactPhone, first_name: "Дилшод" } }
        : { text }),
    },
  };
  return base;
}

export async function sendTelegramUpdate(
  context: TestContext,
  channel: { channelId: string; webhookSecret: string },
  update: Record<string, unknown>,
): Promise<void> {
  await request(context.app)
    .post(`/api/v1/webhooks/telegram/${channel.channelId}`)
    .set("X-Telegram-Bot-Api-Secret-Token", channel.webhookSecret)
    .send(update);

  await context.queue.whenIdle();
}