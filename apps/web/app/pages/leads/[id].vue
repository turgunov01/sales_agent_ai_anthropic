<script setup lang="ts">
import type { LeadStatus, LeadWithEventsDto, UserDto } from "@ai-sales/shared";
import { LEAD_STATUS_TRANSITIONS } from "@ai-sales/shared";

const api = useApi();
const route = useRoute();
const leadId = computed(() => String(route.params.id));

const lead = ref<LeadWithEventsDto | null>(null);
const managers = ref<UserDto[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);
const saving = ref(false);

const nextStatuses = computed<LeadStatus[]>(() =>
  lead.value ? [...LEAD_STATUS_TRANSITIONS[lead.value.status]] : [],
);

const eventLabels: Record<string, string> = {
  CREATED: "Лид создан",
  STATUS_CHANGED: "Статус изменён",
  CONTACT_CAPTURED: "Получен контакт",
  ASSIGNED: "Назначен менеджер",
  NOTE_ADDED: "Комментарий",
  HANDOFF_REQUESTED: "Запрошен менеджер",
};

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    lead.value = await api.get<LeadWithEventsDto>(`/leads/${leadId.value}`);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Лид не найден";
  } finally {
    loading.value = false;
  }
}

async function changeStatus(status: LeadStatus): Promise<void> {
  saving.value = true;
  actionError.value = null;
  try {
    await api.post(`/leads/${leadId.value}/status`, { status, comment: null });
    await load();
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : "Не удалось изменить статус";
  } finally {
    saving.value = false;
  }
}

async function assign(managerId: string): Promise<void> {
  saving.value = true;
  actionError.value = null;
  try {
    await api.post(`/leads/${leadId.value}/assign`, { managerId: managerId || null });
    await load();
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : "Не удалось назначить менеджера";
  } finally {
    saving.value = false;
  }
}

onMounted(async () => {
  managers.value = await api.get<UserDto[]>("/employees").catch(() => []);
  await load();
});
</script>

<template>
  <div>
    <NuxtLink to="/leads" class="mb-4 inline-block text-sm font-semibold text-clay-600 hover:underline">
      ← Все лиды
    </NuxtLink>

    <DataState :loading="loading" :error="error">
      <div v-if="lead" class="flex flex-col gap-6">
        <PageHeader
          eyebrow="Лид"
          :title="lead.name ?? 'Без имени'"
          :description="lead.aiSummary ?? 'Сводка от ассистента появится после диалога.'"
        >
          <template #actions>
            <NuxtLink
              v-if="lead.conversationId"
              :to="`/conversations/${lead.conversationId}`"
              class="btn btn-ghost"
            >
              Открыть диалог
            </NuxtLink>
          </template>
        </PageHeader>

        <p
          v-if="actionError"
          class="rounded-xl border border-rose-600/25 bg-rose-600/6 px-4 py-3 text-sm text-rose-600"
          role="alert"
        >
          {{ actionError }}
        </p>

        <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section class="flex flex-col gap-6">
            <article class="surface p-6">
              <h2 class="font-display mb-5 text-lg font-extrabold">Карточка</h2>
              <dl class="grid gap-x-6 gap-y-4 sm:grid-cols-2">
                <div>
                  <dt class="eyebrow">Телефон</dt>
                  <dd class="mt-1 font-semibold tabular-nums">{{ lead.phone ?? "не получен" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Telegram ID</dt>
                  <dd class="mt-1 tabular-nums">{{ lead.telegramUserId ?? "—" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Интерес</dt>
                  <dd class="mt-1">{{ lead.interest ?? "—" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Бюджет</dt>
                  <dd class="mt-1 tabular-nums">
                    {{ formatBudget(lead.budgetMin, lead.budgetMax, lead.currency) }}
                  </dd>
                </div>
                <div>
                  <dt class="eyebrow">Источник</dt>
                  <dd class="mt-1">{{ lead.source === "TELEGRAM" ? "Telegram" : "Вручную" }}</dd>
                </div>
                <div>
                  <dt class="eyebrow">Создан</dt>
                  <dd class="mt-1">{{ formatDateTime(lead.createdAt) }}</dd>
                </div>
              </dl>

              <div class="mt-6 border-t border-sand-200 pt-5">
                <p class="eyebrow mb-2">Готовность лида</p>
                <div class="flex items-center gap-3">
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-sand-200">
                    <div
                      class="h-full rounded-full bg-clay-500 transition-[width] duration-500"
                      :style="{ width: `${lead.qualificationScore}%` }"
                    />
                  </div>
                  <span class="font-display text-lg font-extrabold tabular-nums">
                    {{ lead.qualificationScore }}
                  </span>
                </div>
              </div>
            </article>

            <article class="surface p-6">
              <h2 class="font-display mb-4 text-lg font-extrabold">История</h2>
              <ol class="relative flex flex-col gap-5 border-l border-sand-300 pl-5">
                <li v-for="event in lead.events" :key="event.id" class="relative">
                  <span
                    class="absolute top-1.5 -left-[25px] h-2.5 w-2.5 rounded-full bg-clay-500"
                    aria-hidden="true"
                  />
                  <p class="text-sm font-semibold">{{ eventLabels[event.type] ?? event.type }}</p>
                  <p v-if="event.comment" class="text-sm text-ink-500">{{ event.comment }}</p>
                  <p class="mt-0.5 text-xs text-ink-500">{{ formatDateTime(event.createdAt) }}</p>
                </li>
              </ol>
            </article>
          </section>

          <aside class="flex flex-col gap-6">
            <article class="surface p-6">
              <p class="eyebrow mb-3">Статус</p>
              <StatusPill :value="lead.status" kind="lead" class="mb-4" />

              <div v-if="nextStatuses.length > 0" class="flex flex-col gap-2">
                <button
                  v-for="status in nextStatuses"
                  :key="status"
                  type="button"
                  class="btn btn-ghost w-full justify-start"
                  :disabled="saving"
                  @click="changeStatus(status)"
                >
                  Перевести в «{{ LEAD_STATUS_LABEL[status] }}»
                </button>
              </div>
              <p v-else class="text-sm text-ink-500">Сделка закрыта, статус изменить нельзя.</p>
            </article>

            <article class="surface p-6">
              <label class="label" for="manager">Ответственный менеджер</label>
              <select
                id="manager"
                class="field"
                :value="lead.assignedManagerId ?? ''"
                :disabled="saving"
                @change="assign(($event.target as HTMLSelectElement).value)"
              >
                <option value="">Не назначен</option>
                <option v-for="manager in managers" :key="manager.id" :value="manager.id">
                  {{ manager.fullName }}
                </option>
              </select>
            </article>

            <article v-if="lead.customer" class="surface p-6">
              <p class="eyebrow mb-3">Клиент</p>
              <p class="font-semibold">{{ customerName(lead.customer) }}</p>
              <p class="mt-1 text-sm text-ink-500">
                {{ lead.customer.username ? "@" + lead.customer.username : "без username" }}
              </p>
              <p class="mt-1 text-sm text-ink-500">
                Язык диалога: {{ lead.customer.language === "UZ" ? "узбекский" : "русский" }}
              </p>
            </article>
          </aside>
        </div>
      </div>
    </DataState>
  </div>
</template>