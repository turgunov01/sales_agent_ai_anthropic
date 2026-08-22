<script setup lang="ts">
import type { LeadDto, LeadStatus, PaginationMeta, UserDto } from "@ai-sales/shared";

const api = useApi();

const leads = ref<LeadDto[]>([]);
const managers = ref<UserDto[]>([]);
const meta = ref<PaginationMeta | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const filters = reactive<{ status: LeadStatus | ""; q: string; page: number }>({
  status: "",
  q: "",
  page: 1,
});

const STATUSES: LeadStatus[] = ["NEW", "QUALIFIED", "CONTACTED", "WON", "LOST"];

const managerName = (id: string | null): string =>
  managers.value.find((manager) => manager.id === id)?.fullName ?? "—";

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.getPaged<LeadDto[]>("/leads", {
      page: filters.page,
      limit: 20,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.q ? { q: filters.q } : {}),
    });
    leads.value = response.data;
    meta.value = response.meta ?? null;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить лиды";
  } finally {
    loading.value = false;
  }
}

function applyStatus(status: LeadStatus | ""): void {
  filters.status = status;
  filters.page = 1;
  void load();
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.page = 1;
      void load();
    }, 350);
  },
);

onMounted(async () => {
  managers.value = await api.get<UserDto[]>("/employees").catch(() => []);
  await load();
});
</script>

<template>
  <div>
    <PageHeader
      eyebrow="CRM"
      title="Лиды"
      description="Каждый лид собран ассистентом из живого диалога — с интересом, бюджетом и контактом."
    />

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="btn px-3 py-1.5 text-xs"
          :class="filters.status === '' ? 'btn-primary' : 'btn-ghost'"
          @click="applyStatus('')"
        >
          Все
        </button>
        <button
          v-for="status in STATUSES"
          :key="status"
          type="button"
          class="btn px-3 py-1.5 text-xs"
          :class="filters.status === status ? 'btn-primary' : 'btn-ghost'"
          @click="applyStatus(status)"
        >
          {{ LEAD_STATUS_LABEL[status] }}
        </button>
      </div>

      <input
        v-model.trim="filters.q"
        class="field ml-auto max-w-xs"
        type="search"
        placeholder="Имя, телефон или интерес"
        aria-label="Поиск по лидам"
      />
    </div>

    <div class="surface overflow-hidden">
      <DataState
        :loading="loading"
        :error="error"
        :empty="leads.length === 0"
        empty-title="Лидов не найдено"
        empty-hint="Измените фильтр или дождитесь первого обращения в Telegram."
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[880px] text-left text-sm">
            <thead class="border-b border-sand-200 bg-sand-50">
              <tr class="eyebrow">
                <th class="px-6 py-3 font-semibold">Клиент</th>
                <th class="px-4 py-3 font-semibold">Интерес</th>
                <th class="px-4 py-3 font-semibold">Бюджет</th>
                <th class="px-4 py-3 font-semibold">Скоринг</th>
                <th class="px-4 py-3 font-semibold">Менеджер</th>
                <th class="px-4 py-3 font-semibold">Статус</th>
                <th class="px-6 py-3 text-right font-semibold">Создан</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sand-200">
              <tr
                v-for="lead in leads"
                :key="lead.id"
                class="cursor-pointer transition-colors hover:bg-sand-50"
                @click="navigateTo(`/leads/${lead.id}`)"
              >
                <td class="px-6 py-4">
                  <p class="font-semibold">{{ lead.name ?? "Без имени" }}</p>
                  <p class="text-xs tabular-nums text-ink-500">{{ lead.phone ?? "нет телефона" }}</p>
                </td>
                <td class="max-w-xs px-4 py-4">
                  <p class="truncate text-ink-700">{{ lead.interest ?? "—" }}</p>
                </td>
                <td class="px-4 py-4 whitespace-nowrap tabular-nums">
                  {{ formatBudget(lead.budgetMin, lead.budgetMax, lead.currency) }}
                </td>
                <td class="px-4 py-4">
                  <div class="flex items-center gap-2">
                    <div class="h-1.5 w-16 overflow-hidden rounded-full bg-sand-200">
                      <div
                        class="h-full rounded-full bg-clay-500"
                        :style="{ width: `${lead.qualificationScore}%` }"
                      />
                    </div>
                    <span class="text-xs tabular-nums text-ink-500">{{ lead.qualificationScore }}</span>
                  </div>
                </td>
                <td class="px-4 py-4 text-ink-700">{{ managerName(lead.assignedManagerId) }}</td>
                <td class="px-4 py-4"><StatusPill :value="lead.status" kind="lead" /></td>
                <td class="px-6 py-4 text-right text-xs whitespace-nowrap text-ink-500">
                  {{ formatRelative(lead.createdAt) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="meta && meta.totalPages > 1"
          class="flex items-center justify-between border-t border-sand-200 px-6 py-4 text-sm"
        >
          <span class="text-ink-500">
            Страница {{ meta.page }} из {{ meta.totalPages }} · всего {{ meta.total }}
          </span>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-ghost px-3 py-1.5 text-xs"
              :disabled="filters.page <= 1"
              @click="filters.page -= 1; load()"
            >
              Назад
            </button>
            <button
              type="button"
              class="btn btn-ghost px-3 py-1.5 text-xs"
              :disabled="filters.page >= meta.totalPages"
              @click="filters.page += 1; load()"
            >
              Вперёд
            </button>
          </div>
        </div>
      </DataState>
    </div>
  </div>
</template>