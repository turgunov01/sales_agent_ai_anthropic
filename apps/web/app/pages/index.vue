<script setup lang="ts">
import type { AnalyticsOverviewDto, LeadDto } from "@ai-sales/shared";

const api = useApi();
const auth = useAuthStore();

const overview = ref<AnalyticsOverviewDto | null>(null);
const recentLeads = ref<LeadDto[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

const funnel = computed(() => {
  const byStatus = overview.value?.leads.byStatus;
  if (!byStatus) return [];
  return (["NEW", "QUALIFIED", "CONTACTED", "WON", "LOST"] as const).map((status) => ({
    status,
    count: byStatus[status] ?? 0,
  }));
});

const maxDaily = computed(() =>
  Math.max(1, ...(overview.value?.daily ?? []).map((point) => point.leads)),
);

const conversionLabel = computed(() =>
  overview.value ? `${Math.round(overview.value.conversionRate * 100)}%` : "—",
);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [stats, leads] = await Promise.all([
      api.get<AnalyticsOverviewDto>("/analytics/overview", { days: 30 }),
      api.get<LeadDto[]>("/leads", { limit: 6 }),
    ]);
    overview.value = stats;
    recentLeads.value = leads;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить данные";
  } finally {
    loading.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Последние 30 дней"
      :title="auth.company?.name ?? 'Обзор'"
      description="Что происходит с продажами, пока ассистент отвечает клиентам."
    >
      <template #actions>
        <NuxtLink to="/leads" class="btn btn-ghost">Все лиды</NuxtLink>
        <NuxtLink to="/settings" class="btn btn-primary">Настроить бота</NuxtLink>
      </template>
    </PageHeader>

    <DataState :loading="loading" :error="error">
      <div v-if="overview" class="flex flex-col gap-6">
        <section class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatTile
            accent
            label="Лидов за месяц"
            :value="overview.leads.total"
            :hint="`${overview.leads.byStatus.QUALIFIED} квалифицировано ассистентом`"
          />
          <StatTile
            label="Диалогов"
            :value="overview.conversations.total"
            :hint="`${overview.conversations.active} активны сейчас`"
          />
          <StatTile
            label="Ответов AI"
            :value="overview.messages.byAssistant"
            :hint="`из ${overview.messages.total} сообщений`"
          />
          <StatTile
            label="Конверсия в продажу"
            :value="conversionLabel"
            :hint="`${overview.leads.byStatus.WON} закрытых сделок`"
          />
        </section>

        <section class="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <article class="surface p-6">
            <div class="mb-6 flex items-baseline justify-between">
              <h2 class="font-display text-lg font-extrabold">Лиды по дням</h2>
              <span class="text-xs text-ink-500">максимум {{ maxDaily }} в день</span>
            </div>

            <div class="flex h-40 items-end gap-[3px]">
              <div
                v-for="point in overview.daily"
                :key="point.date"
                class="group relative flex-1 rounded-t-sm bg-sand-300 transition-colors hover:bg-clay-500"
                :style="{ height: `${Math.max(4, (point.leads / maxDaily) * 100)}%` }"
              >
                <span
                  class="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-ink-900 px-2 py-1 text-[11px] whitespace-nowrap text-sand-50 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  {{ point.date }}: {{ point.leads }}
                </span>
              </div>
            </div>

            <div class="mt-6 grid grid-cols-2 gap-3 border-t border-sand-200 pt-5 sm:grid-cols-5">
              <div v-for="stage in funnel" :key="stage.status">
                <p class="font-display text-2xl font-extrabold tabular-nums">{{ stage.count }}</p>
                <StatusPill :value="stage.status" kind="lead" class="mt-1" />
              </div>
            </div>
          </article>

          <article class="surface flex flex-col p-6">
            <h2 class="font-display mb-4 text-lg font-extrabold">Требуют внимания</h2>

            <div
              class="mb-4 rounded-xl border px-4 py-3"
              :class="
                overview.conversations.handoffRequested > 0
                  ? 'border-amber-600/30 bg-amber-600/8'
                  : 'border-sand-200 bg-sand-50'
              "
            >
              <p class="font-display text-3xl font-extrabold tabular-nums">
                {{ overview.conversations.handoffRequested }}
              </p>
              <p class="mt-1 text-sm text-ink-500">диалогов ждут менеджера</p>
            </div>

            <dl class="flex flex-col gap-3 text-sm">
              <div class="flex items-center justify-between">
                <dt class="text-ink-500">Товаров в каталоге</dt>
                <dd class="font-semibold tabular-nums">{{ overview.products.active }}</dd>
              </div>
              <div class="flex items-center justify-between">
                <dt class="text-ink-500">Скрытых позиций</dt>
                <dd class="font-semibold tabular-nums">
                  {{ overview.products.total - overview.products.active }}
                </dd>
              </div>
            </dl>

            <NuxtLink to="/conversations" class="btn btn-ghost mt-auto w-full">
              Открыть диалоги
            </NuxtLink>
          </article>
        </section>

        <section class="surface overflow-hidden">
          <div class="flex items-center justify-between px-6 py-5">
            <h2 class="font-display text-lg font-extrabold">Свежие лиды</h2>
            <NuxtLink to="/leads" class="text-sm font-semibold text-clay-600 hover:underline">
              Смотреть все
            </NuxtLink>
          </div>

          <DataState
            :empty="recentLeads.length === 0"
            empty-title="Лидов пока нет"
            empty-hint="Как только клиент напишет боту и оставит контакт, лид появится здесь."
          >
            <ul class="divide-y divide-sand-200 border-t border-sand-200">
              <li v-for="lead in recentLeads" :key="lead.id">
                <NuxtLink
                  :to="`/leads/${lead.id}`"
                  class="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-sand-50"
                >
                  <div class="min-w-0 flex-1">
                    <p class="truncate font-semibold">{{ lead.name ?? "Без имени" }}</p>
                    <p class="truncate text-sm text-ink-500">{{ lead.interest ?? "Интерес не указан" }}</p>
                  </div>
                  <span class="text-sm tabular-nums text-ink-700">{{ lead.phone ?? "нет телефона" }}</span>
                  <StatusPill :value="lead.status" kind="lead" />
                  <span class="w-24 text-right text-xs text-ink-500">{{ formatRelative(lead.createdAt) }}</span>
                </NuxtLink>
              </li>
            </ul>
          </DataState>
        </section>
      </div>
    </DataState>
  </div>
</template>