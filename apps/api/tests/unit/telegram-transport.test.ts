import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HttpTelegramTransport } from "../../src/modules/channels/telegram/telegram.transport.js";

const BOT_TOKEN = "123456789:AAEhBOweik6ad9r_ZeuFRFF-DEMOtokenXYZ";

interface CapturedCall {
  url: string;
  body: Record<string, unknown>;
}

let captured: CapturedCall[];
let transport: HttpTelegramTransport;

function mockFetch(response: unknown, ok = true): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: { body: string }) => {
      captured.push({ url, body: JSON.parse(init.body) as Record<string, unknown> });
      return {
        ok,
        status: ok ? 200 : 400,
        json: async () => response,
      } as Response;
    }),
  );
}

beforeEach(() => {
  captured = [];
  transport = new HttpTelegramTransport("https://api.telegram.test");
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HttpTelegramTransport", () => {
  it("getMe возвращает идентичность бота", async () => {
    mockFetch({ ok: true, result: { id: 42, username: "mebel_bot" } });

    const identity = await transport.getMe(BOT_TOKEN);

    expect(identity).toEqual({ id: 42, username: "mebel_bot" });
    expect(captured[0]?.url).toBe(`https://api.telegram.test/bot${BOT_TOKEN}/getMe`);
  });

  it("setWebhook передаёт секрет и ограничивает типы апдейтов", async () => {
    mockFetch({ ok: true, result: true });

    await transport.setWebhook(BOT_TOKEN, "https://api.example.uz/hook", "s3cret");

    expect(captured[0]?.body).toMatchObject({
      url: "https://api.example.uz/hook",
      secret_token: "s3cret",
      allowed_updates: ["message"],
      drop_pending_updates: true,
    });
  });

  it("sendMessage отключает предпросмотр ссылок", async () => {
    mockFetch({ ok: true, result: {} });

    await transport.sendMessage(BOT_TOKEN, { chatId: "555", text: "Здравствуйте" });

    expect(captured[0]?.body).toMatchObject({
      chat_id: "555",
      text: "Здравствуйте",
      disable_web_page_preview: true,
    });
    expect(captured[0]?.body.reply_markup).toBeUndefined();
  });

  it("sendMessage добавляет кнопку запроса контакта", async () => {
    mockFetch({ ok: true, result: {} });

    await transport.sendMessage(BOT_TOKEN, {
      chatId: "555",
      text: "Оставьте номер",
      requestContactButton: { label: "Отправить номер" },
    });

    expect(captured[0]?.body.reply_markup).toEqual({
      keyboard: [[{ text: "Отправить номер", request_contact: true }]],
      resize_keyboard: true,
      one_time_keyboard: true,
    });
  });

  it("sendMessage умеет убирать клавиатуру", async () => {
    mockFetch({ ok: true, result: {} });

    await transport.sendMessage(BOT_TOKEN, { chatId: "555", text: "Готово", removeKeyboard: true });

    expect(captured[0]?.body.reply_markup).toEqual({ remove_keyboard: true });
  });

  it("sendPhoto отправляет ссылку и подпись", async () => {
    mockFetch({ ok: true, result: {} });

    await transport.sendPhoto(BOT_TOKEN, {
      chatId: "555",
      photoUrl: "https://cdn.uz/milan.jpg",
      caption: "Диван «Милан»",
    });

    expect(captured[0]?.body).toMatchObject({
      chat_id: "555",
      photo: "https://cdn.uz/milan.jpg",
      caption: "Диван «Милан»",
    });
  });

  it("превращает отказ Telegram в понятную ошибку канала", async () => {
    mockFetch({ ok: false, description: "Unauthorized" }, false);

    await expect(transport.getMe(BOT_TOKEN)).rejects.toThrow("Telegram API");
  });

  it("не падает молча при сетевой ошибке", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("ECONNRESET");
      }),
    );

    await expect(transport.deleteWebhook(BOT_TOKEN)).rejects.toThrow("Telegram API");
  });
});