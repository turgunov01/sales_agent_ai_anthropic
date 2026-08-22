import { Language, MessageRole } from "@ai-sales/shared";
import { logger } from "../../core/logger.js";
import { truncate } from "../../core/utils/text.js";
import type { MessageEntity } from "../../domain/entities.js";
import type { CompanyService } from "../company/company.service.js";
import type { ConversationsService } from "../conversations/conversations.service.js";
import type { LeadsService } from "../leads/leads.service.js";
import type {
  LlmClient,
  LlmMessage,
  LlmRequestBlock,
  LlmToolResultBlock,
  LlmToolUseBlock,
} from "./llm.client.js";
import { buildSystemPrompt } from "./prompt.builder.js";
import { TOOL_DEFINITIONS } from "./tools/definitions.js";
import type { ToolExecutor } from "./tools/executor.js";
import type { AgentContext, AgentEffect, AgentResult, AgentToolCall } from "./types.js";

const FALLBACK_TEXT: Record<Language, string> = {
  RU: "Извините, сейчас не могу ответить. Я передал ваш вопрос менеджеру — он свяжется с вами в ближайшее время.",
  UZ: "Uzr, hozir javob bera olmayapman. Savolingizni menejerga uzatdim — u tez orada siz bilan bog'lanadi.",
};

const MAX_REPLY_LENGTH = 3800;

export interface AiAgentOptions {
  maxToolIterations: number;
  historyWindow: number;
}

export class AiAgentService {
  constructor(
    private readonly llm: LlmClient,
    private readonly executor: ToolExecutor,
    private readonly company: CompanyService,
    private readonly conversations: ConversationsService,
    private readonly leads: LeadsService,
    private readonly options: AiAgentOptions,
  ) {}

  /**
   * Формирует ответ на последнее сообщение клиента.
   * Входящее сообщение должно быть уже сохранено в истории диалога.
   */
  async reply(ctx: AgentContext): Promise<AgentResult> {
    const context = await this.company.loadAiContext(ctx.companyId);

    if (!context.settings.enabled) {
      return this.emptyResult(true);
    }

    const lead = await this.leads.findOpenByConversation(ctx.companyId, ctx.conversationId);
    const system = buildSystemPrompt({
      company: context.company,
      knowledge: context.knowledge,
      faq: context.faq,
      settings: context.settings,
      language: ctx.language,
      lead,
      customerName: ctx.customerName,
    });

    const history = await this.conversations.history(
      ctx.companyId,
      ctx.conversationId,
      this.options.historyWindow,
    );
    const messages = toLlmMessages(history);

    if (messages.length === 0) return this.emptyResult(true);

    const effects: AgentEffect[] = [];
    const toolCalls: AgentToolCall[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    let text = "";

    try {
      for (let iteration = 0; iteration < this.options.maxToolIterations; iteration += 1) {
        const response = await this.llm.complete({
          model: context.settings.model,
          system,
          messages: [...messages],
          tools: TOOL_DEFINITIONS,
          maxTokens: context.settings.maxTokens,
          temperature: context.settings.temperature,
        });

        inputTokens += response.usage.inputTokens;
        outputTokens += response.usage.outputTokens;

        const textParts = response.content
          .filter((block): block is { type: "text"; text: string } => block.type === "text")
          .map((block) => block.text.trim())
          .filter((value) => value.length > 0);
        if (textParts.length > 0) text = textParts.join("\n\n");

        const toolUses = response.content.filter(
          (block): block is LlmToolUseBlock => block.type === "tool_use",
        );
        if (toolUses.length === 0) break;

        messages.push({ role: "assistant", content: response.content as LlmRequestBlock[] });

        const results: LlmToolResultBlock[] = [];
        for (const toolUse of toolUses) {
          const outcome = await this.executor.execute(toolUse.name, toolUse.input, ctx);
          effects.push(...outcome.effects);
          toolCalls.push({ name: toolUse.name, input: toolUse.input, ok: !outcome.isError });
          results.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: outcome.content,
            ...(outcome.isError ? { is_error: true } : {}),
          });
        }

        messages.push({ role: "user", content: results });

        if (iteration === this.options.maxToolIterations - 1) {
          logger.warn(
            { companyId: ctx.companyId, conversationId: ctx.conversationId },
            "Достигнут лимит итераций tool-use",
          );
        }
      }
    } catch (error) {
      logger.error(
        { err: error, companyId: ctx.companyId, conversationId: ctx.conversationId },
        "AI-агент не смог сформировать ответ",
      );
      return {
        text: FALLBACK_TEXT[ctx.language],
        effects: [
          { type: "TRANSFER_TO_MANAGER", reason: "AI недоступен", urgency: "high" },
          ...effects,
        ],
        toolCalls,
        usage: { inputTokens, outputTokens },
        degraded: true,
      };
    }

    if (text.trim().length === 0) {
      text = FALLBACK_TEXT[ctx.language];
      effects.push({ type: "TRANSFER_TO_MANAGER", reason: "Пустой ответ модели", urgency: "normal" });
    }

    return {
      text: truncate(text, MAX_REPLY_LENGTH),
      effects: dedupeEffects(effects),
      toolCalls,
      usage: { inputTokens, outputTokens },
      degraded: false,
    };
  }

  private emptyResult(degraded: boolean): AgentResult {
    return {
      text: "",
      effects: [],
      toolCalls: [],
      usage: { inputTokens: 0, outputTokens: 0 },
      degraded,
    };
  }
}

/**
 * История диалога → формат сообщений модели.
 * Требования: чередование ролей, первое сообщение от пользователя,
 * системные события в модель не передаются.
 */
export function toLlmMessages(history: MessageEntity[]): LlmMessage[] {
  const mapped: LlmMessage[] = [];

  for (const message of history) {
    if (message.role === MessageRole.SYSTEM) continue;
    if (message.content.trim().length === 0) continue;

    const role = message.role === MessageRole.CUSTOMER ? "user" : "assistant";
    const previous = mapped[mapped.length - 1];

    if (previous && previous.role === role && typeof previous.content === "string") {
      previous.content = `${previous.content}\n${message.content}`;
      continue;
    }
    mapped.push({ role, content: message.content });
  }

  while (mapped.length > 0 && mapped[0]?.role === "assistant") mapped.shift();
  while (mapped.length > 0 && mapped[mapped.length - 1]?.role === "assistant") mapped.pop();

  return mapped;
}

/** Убираем повторы эффектов, сохраняя порядок: карточки товаров не должны дублироваться. */
export function dedupeEffects(effects: AgentEffect[]): AgentEffect[] {
  const seenProducts = new Set<string>();
  const result: AgentEffect[] = [];
  let hasContactRequest = false;
  let hasTransfer = false;

  for (const effect of effects) {
    if (effect.type === "SHOW_PRODUCTS") {
      const fresh = effect.productIds.filter((id) => !seenProducts.has(id));
      fresh.forEach((id) => seenProducts.add(id));
      if (fresh.length > 0) result.push({ type: "SHOW_PRODUCTS", productIds: fresh });
      continue;
    }
    if (effect.type === "REQUEST_CONTACT") {
      if (hasContactRequest) continue;
      hasContactRequest = true;
    }
    if (effect.type === "TRANSFER_TO_MANAGER") {
      if (hasTransfer) continue;
      hasTransfer = true;
    }
    result.push(effect);
  }

  return result;
}