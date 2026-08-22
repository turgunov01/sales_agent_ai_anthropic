import type { RequestHandler } from "express";
import { env } from "./config/env.js";
import { internal } from "./core/errors.js";
import { InProcessQueue, backgroundQueue } from "./core/queue/in-process-queue.js";
import type { Repositories } from "./domain/repositories.js";
import { createPrismaRepositories } from "./infra/prisma/index.js";
import { AiAgentService } from "./modules/ai/agent.service.js";
import {
  AnthropicLlmClient,
  DisabledLlmClient,
  type LlmClient,
} from "./modules/ai/llm.client.js";
import { OpenAiLlmClient } from "./modules/ai/openai.client.js";
import { ToolExecutor } from "./modules/ai/tools/executor.js";
import { AnalyticsService } from "./modules/analytics/analytics.service.js";
import { createAuthenticate } from "./modules/auth/auth.middleware.js";
import { AuthService } from "./modules/auth/auth.service.js";
import { ChannelsService } from "./modules/channels/channels.service.js";
import { TelegramDispatcher } from "./modules/channels/telegram/telegram.dispatcher.js";
import { HttpTelegramTransport } from "./modules/channels/telegram/telegram.transport.js";
import type { TelegramTransport } from "./modules/channels/telegram/telegram.types.js";
import { CompanyService } from "./modules/company/company.service.js";
import {
  ConversationsService,
  type OutboundDelivery,
} from "./modules/conversations/conversations.service.js";
import { EmployeesService } from "./modules/employees/employees.service.js";
import { LeadsService } from "./modules/leads/leads.service.js";
import { ProductsService } from "./modules/products/products.service.js";

export interface AppServices {
  auth: AuthService;
  employees: EmployeesService;
  company: CompanyService;
  products: ProductsService;
  leads: LeadsService;
  conversations: ConversationsService;
  channels: ChannelsService;
  analytics: AnalyticsService;
  agent: AiAgentService;
  dispatcher: TelegramDispatcher;
}

export interface AppContainer {
  repos: Repositories;
  services: AppServices;
  queue: InProcessQueue;
  authenticate: RequestHandler;
}

export interface ContainerOverrides {
  repos?: Repositories;
  llm?: LlmClient;
  telegram?: TelegramTransport;
  queue?: InProcessQueue;
  now?: () => Date;
}

/** Клиент модели по выбранному провайдеру; без ключа — честная деградация. */
function createLlmClient(): LlmClient {
  if (!env.aiEnabled) return new DisabledLlmClient();
  return env.AI_PROVIDER === "openai"
    ? new OpenAiLlmClient(env.OPENAI_API_KEY, env.OPENAI_MODEL, env.AI_REQUEST_TIMEOUT_MS)
    : new AnthropicLlmClient(env.ANTHROPIC_API_KEY);
}

/**
 * Единая точка сборки зависимостей. Тесты подменяют репозитории,
 * клиент модели и транспорт Telegram, не трогая ни один сервис.
 */
export function createContainer(overrides: ContainerOverrides = {}): AppContainer {
  const repos = overrides.repos ?? createPrismaRepositories();
  const queue = overrides.queue ?? backgroundQueue;
  const now = overrides.now ?? (() => new Date());
  const telegram = overrides.telegram ?? new HttpTelegramTransport();
  const llm = overrides.llm ?? createLlmClient();

  const auth = new AuthService(repos, now);
  const employees = new EmployeesService(repos);
  const company = new CompanyService(repos);
  const products = new ProductsService(repos);
  const leads = new LeadsService(repos, now);
  const analytics = new AnalyticsService(repos, now);

  // Диспетчер канала и сервис диалогов ссылаются друг на друга:
  // диалоги отправляют исходящие через канал, канал сохраняет сообщения в диалог.
  // Ссылку разрываем поздним связыванием через порт доставки.
  let dispatcher: TelegramDispatcher | null = null;
  const delivery: OutboundDelivery = {
    async deliverText(input) {
      if (!dispatcher) throw internal("Канальный слой не инициализирован");
      await dispatcher.deliverText(input);
    },
  };

  const conversations = new ConversationsService(
    repos,
    delivery,
    env.CONVERSATION_IDLE_HOURS,
    now,
  );

  const executor = new ToolExecutor(repos, company, leads);
  const agent = new AiAgentService(llm, executor, company, conversations, leads, {
    maxToolIterations: env.AI_MAX_TOOL_ITERATIONS,
    historyWindow: env.AI_HISTORY_WINDOW,
  });

  dispatcher = new TelegramDispatcher(repos, conversations, leads, agent, telegram);
  const channels = new ChannelsService(repos, telegram, now);

  return {
    repos,
    queue,
    authenticate: createAuthenticate(repos),
    services: {
      auth,
      employees,
      company,
      products,
      leads,
      conversations,
      channels,
      analytics,
      agent,
      dispatcher,
    },
  };
}