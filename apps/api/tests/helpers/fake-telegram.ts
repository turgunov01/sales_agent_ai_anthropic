import type {
  BotIdentity,
  SendMessageParams,
  SendPhotoParams,
  TelegramTransport,
} from "../../src/modules/channels/telegram/telegram.types.js";

export interface RecordedCall {
  method: "getMe" | "setWebhook" | "deleteWebhook" | "sendMessage" | "sendPhoto";
  botToken: string;
  payload: unknown;
}

/** Фейковый транспорт Telegram: тест утверждает, что именно было отправлено клиенту. */
export class FakeTelegramTransport implements TelegramTransport {
  readonly calls: RecordedCall[] = [];
  identity: BotIdentity = { id: 987654321, username: "mebel_style_bot" };
  failSetWebhook = false;

  reset(): void {
    this.calls.length = 0;
    this.failSetWebhook = false;
  }

  get sentMessages(): SendMessageParams[] {
    return this.calls
      .filter((call) => call.method === "sendMessage")
      .map((call) => call.payload as SendMessageParams);
  }

  get sentPhotos(): SendPhotoParams[] {
    return this.calls
      .filter((call) => call.method === "sendPhoto")
      .map((call) => call.payload as SendPhotoParams);
  }

  async getMe(botToken: string): Promise<BotIdentity> {
    this.calls.push({ method: "getMe", botToken, payload: null });
    return this.identity;
  }

  async setWebhook(botToken: string, url: string, secret: string): Promise<void> {
    this.calls.push({ method: "setWebhook", botToken, payload: { url, secret } });
    if (this.failSetWebhook) throw new Error("Telegram отклонил webhook");
  }

  async deleteWebhook(botToken: string): Promise<void> {
    this.calls.push({ method: "deleteWebhook", botToken, payload: null });
  }

  async sendMessage(botToken: string, params: SendMessageParams): Promise<void> {
    this.calls.push({ method: "sendMessage", botToken, payload: params });
  }

  async sendPhoto(botToken: string, params: SendPhotoParams): Promise<void> {
    this.calls.push({ method: "sendPhoto", botToken, payload: params });
  }
}