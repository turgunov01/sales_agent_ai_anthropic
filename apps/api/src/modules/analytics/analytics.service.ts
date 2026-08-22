import {
  ConversationStatus,
  LeadStatus,
  type AnalyticsOverviewDto,
} from "@ai-sales/shared";
import type { AuthContext } from "../../core/security/tokens.js";
import type { Repositories } from "../../domain/repositories.js";

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export class AnalyticsService {
  constructor(
    private readonly repos: Repositories,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async overview(auth: AuthContext, days: number): Promise<AnalyticsOverviewDto> {
    const since = new Date(this.now().getTime() - days * 24 * 60 * 60 * 1000);
    const companyId = auth.companyId;

    const [
      leadsByStatus,
      conversationsTotal,
      activeConversations,
      handoffConversations,
      messages,
      productsTotal,
      productsActive,
      leadsSince,
      conversationsSince,
    ] = await Promise.all([
      this.repos.leads.countByStatus(companyId, since),
      this.repos.conversations.countAll(companyId, since),
      this.repos.conversations.countByStatus(companyId, ConversationStatus.ACTIVE),
      this.repos.conversations.countByStatus(companyId, ConversationStatus.HANDOFF_REQUESTED),
      this.repos.conversations.countMessages(companyId, since),
      this.repos.products.countAll(companyId),
      this.repos.products.countActive(companyId),
      this.repos.leads.listCreatedSince(companyId, since),
      this.repos.conversations.listCreatedSince(companyId, since),
    ]);

    const totalLeads = Object.values(leadsByStatus).reduce((sum, value) => sum + value, 0);
    const won = leadsByStatus[LeadStatus.WON] ?? 0;

    return {
      leads: { total: totalLeads, byStatus: leadsByStatus },
      conversations: {
        total: conversationsTotal,
        active: activeConversations,
        handoffRequested: handoffConversations,
      },
      messages: { total: messages.total, byAssistant: messages.assistant },
      products: { total: productsTotal, active: productsActive },
      conversionRate: totalLeads > 0 ? Number((won / totalLeads).toFixed(4)) : 0,
      daily: this.buildDailySeries(days, since, leadsSince, conversationsSince),
    };
  }

  private buildDailySeries(
    days: number,
    since: Date,
    leads: Array<{ createdAt: Date }>,
    conversations: Array<{ createdAt: Date }>,
  ): AnalyticsOverviewDto["daily"] {
    const leadCounts = new Map<string, number>();
    const conversationCounts = new Map<string, number>();

    for (const lead of leads) {
      const key = dayKey(lead.createdAt);
      leadCounts.set(key, (leadCounts.get(key) ?? 0) + 1);
    }
    for (const conversation of conversations) {
      const key = dayKey(conversation.createdAt);
      conversationCounts.set(key, (conversationCounts.get(key) ?? 0) + 1);
    }

    const series: AnalyticsOverviewDto["daily"] = [];
    for (let offset = 0; offset < days; offset += 1) {
      const date = new Date(since.getTime() + offset * 24 * 60 * 60 * 1000);
      const key = dayKey(date);
      series.push({
        date: key,
        leads: leadCounts.get(key) ?? 0,
        conversations: conversationCounts.get(key) ?? 0,
      });
    }
    return series;
  }
}