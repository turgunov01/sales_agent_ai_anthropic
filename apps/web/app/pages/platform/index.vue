<script setup lang="ts">
import type { CompanyStatus, CompanySummaryDto, PaginationMeta, PlatformAuditDto } from "@ai-sales/shared";

definePageMeta({ layout: "platform" });

const api = usePlatformApi();

const companies = ref<CompanySummaryDto[]>([]);
const audit = ref<PlatformAuditDto[]>([]);
const meta = ref<PaginationMeta | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

const filters = reactive<{ search: string; status: CompanyStatus | ""; page: number }>({
  search: "",
  status: "",
  page: 1,
});

const showCreate = ref(false);
const creating = ref(false);
const createError = ref<string | null>(null);
const form = reactive({
  companyName: "",
  ownerFullName: "",
  ownerEmail: "",
  ownerPassword: "",
  phone: "",
});

const totals = computed(() => ({
  companies: meta.value?.total ?? companies.value.length,
  active: companies.value.filter((company) => company.status === "ACTIVE").length,
  connected: companies.value.filter((company) => company.channelConnected).length,
  leads: companies.value.reduce((sum, company) => sum + company.leads, 0),
}));

const ACTION_LABEL: Record<string, string> = {
  login: "вход оператора",
  "company.create": "создана компания",
  "company.suspend": "компания заблокирована",
  "company.activate": "компания разблокирована",
};

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [list, log] = await Promise.all([
      api.getPaged<CompanySummaryDto[]>("/companies", {
        page: filters.page,
        limit: 20,
        ...(filters.search ? { search: filters.search } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      }),
      api.get<PlatformAuditDto[]>("/audit", { limit: 12 }),
    ]);
    companies.value = list.data;
    meta.value = list.meta ?? null;
    audit.value = log;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить компании";
  } finally {
    loading.value = false;
  }
}

async function createCompany(): Promise<void> {
  creating.value = true;
  createError.value = null;
  try {
    const created = await api.post<CompanySummaryDto>("/companies", {
      companyName: form.companyName,
      ownerFullName: form.ownerFullName,
      ownerEmail: form.ownerEmail,
      ownerPassword: form.ownerPassword,
      ...(form.phone ? { phone: form.phone } : {}),
    });
    notice.value = `Компания «${created.name}» создана. Владелец может входить с указанным паролем.`;
    Object.assign(form, {
      companyName: "",
      ownerFullName: "",
      ownerEmail: "",
      ownerPassword: "",
      phone: "",
    });
    showCreate.value = false;
    await load();
  } catch (caught) {
    createError.value = caught instanceof Error ? caught.message : "Не удалось создать компанию";
  } finally {
    creating.value = false;
  }
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => filters.search,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.page = 1;
      void load();
    }, 350);
  },
);

onMounted(load);
</script>

<template>
  <div>
    <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p class="eyebrow mb-2 text-sand-400">Оператор</p>
        <h1 class="font-display text-3xl font-extrabold text-sand-50">Компании</h1>
        <p class="mt-1 text-sm text-sand-400">Все клиенты платформы и их состояние.</p>
      </div>
      <button type="button" class="btn btn-primary" @click="showCreate = !showCreate">
        Завести компанию
      </button>
    </header>

    <p
      v-if="notice"
      class="mb-5 rounded-xl border border-moss-500/30 bg-moss-500/10 px-4 py-3 text-sm text-moss-500"
      role="status"
    >
      {{ notice }}
    </p>

    <section v-if="showCreate" class="surface mb-6 p-6">
      <h2 class="font-display mb-1 text-lg font-extrabold">Новая компания</h2>
      <p class="mb-4 text-sm text-ink-500">
        Создаются компания и учётная запись владельца. Пароль передайте клиенту — сменить его он
        сможет сам.
      </p>
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="createCompany">
        <div>
          <label class="label" for="companyName">Название магазина</label>
          <input id="companyName" v-model.trim="form.companyName" class="field" required />
        </div>
        <div>
          <label class="label" for="phone">Телефон</label>
          <input id="phone" v-model.trim="form.phone" class="field" placeholder="+998 90 123 45 67" />
        </div>
        <div>
          <label class="label" for="ownerFullName">Имя владельца</label>
          <input id="ownerFullName" v-model.trim="form.ownerFullName" class="field" required />
        </div>
        <div>
          <label class="label" for="ownerEmail">Email владельца</label>
          <input id="ownerEmail" v-model.trim="form.ownerEmail" type="email" class="field" required />
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="ownerPassword">Пароль владельца</label>
          <input
            id="ownerPassword"
            v-model="form.ownerPassword"
            class="field font-mono"
            required
            placeholder="Не короче 10 символов, буква и цифра"
          />
        </div>
        <p v-if="createError" class="text-sm text-rose-600 sm:col-span-2" role="alert">
          {{ createError }}
        </p>
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" class="btn btn-primary" :disabled="creating">
            {{ creating ? "Создаём…" : "Создать" }}
          </button>
          <button type="button" class="btn btn-ghost" @click="showCreate = false">Отмена</button>
        </div>
      </form>
    </section>

    <section class="mb-6 grid gap-3 sm:grid-cols-4">
      <div class="surface p-4">
        <p class="eyebrow">Компаний</p>
        <p class="font-display mt-1 text-3xl font-extrabold tabular-nums">{{ totals.companies }}</p>
      </div>
      <div class="surface p-4">
        <p class="eyebrow">Активных</p>
        <p class="font-display mt-1 text-3xl font-extrabold tabular-nums">{{ totals.active }}</p>
      </div>
      <div class="surface p-4">
        <p class="eyebrow">С ботом</p>
        <p class="font-display mt-1 text-3xl font-extrabold tabular-nums">{{ totals.connected }}</p>
      </div>
      <div class="surface p-4">
        <p class="eyebrow">Лидов всего</p>
        <p class="font-display mt-1 text-3xl font-extrabold tabular-nums">{{ totals.leads }}</p>
      </div>
    </section>

    <div class="mb-4 flex flex-wrap items-center gap-2">
      <button
        type="button"
        class="btn px-3 py-1.5 text-xs"
        :class="filters.status === '' ? 'btn-primary' : 'btn-ghost'"
        @click="filters.status = ''; filters.page = 1; load()"
      >
        Все
      </button>
      <button
        type="button"
        class="btn px-3 py-1.5 text-xs"
        :class="filters.status === 'ACTIVE' ? 'btn-primary' : 'btn-ghost'"
        @click="filters.status = 'ACTIVE'; filters.page = 1; load()"
      >
        Активные
      </button>
      <button
        type="button"
        class="btn px-3 py-1.5 text-xs"
        :class="filters.status === 'SUSPENDED' ? 'btn-primary' : 'btn-ghost'"
        @click="filters.status = 'SUSPENDED'; filters.page = 1; load()"
      >
        Заблокированные
      </button>
      <input
        v-model.trim="filters.search"
        class="field ml-auto max-w-xs"
        type="search"
        placeholder="Название или slug"
        aria-label="Поиск компаний"
      />
    </div>

    <div class="surface overflow-hidden">
      <DataState
        :loading="loading"
        :error="error"
        :empty="companies.length === 0"
        empty-title="Компаний нет"
        empty-hint="Заведите первую компанию или дождитесь самостоятельной регистрации."
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[860px] text-left text-sm">
            <thead class="border-b border-sand-200 bg-sand-50">
              <tr class="eyebrow">
                <th class="px-6 py-3 font-semibold">Компания</th>
                <th class="px-4 py-3 font-semibold">Сотрудников</th>
                <th class="px-4 py-3 font-semibold">Товаров</th>
                <th class="px-4 py-3 font-semibold">Диалогов</th>
                <th class="px-4 py-3 font-semibold">Лиды</th>
                <th class="px-4 py-3 font-semibold">Бот</th>
                <th class="px-6 py-3 text-right font-semibold">Статус</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sand-200">
              <tr
                v-for="company in companies"
                :key="company.id"
                class="cursor-pointer transition-colors hover:bg-sand-50"
                @click="navigateTo(`/platform/companies/${company.id}`)"
              >
                <td class="px-6 py-4">
                  <p class="font-semibold">{{ company.name }}</p>
                  <p class="text-xs text-ink-500">{{ company.slug }}</p>
                </td>
                <td class="px-4 py-4 tabular-nums">{{ company.users }}</td>
                <td class="px-4 py-4 tabular-nums">{{ company.products }}</td>
                <td class="px-4 py-4 tabular-nums">{{ company.conversations }}</td>
                <td class="px-4 py-4 tabular-nums">
                  {{ company.leads }}
                  <span class="text-xs text-moss-500">({{ company.qualifiedLeads }} кв.)</span>
                </td>
                <td class="px-4 py-4">
                  <span :class="company.channelConnected ? 'text-moss-500' : 'text-ink-500'">
                    {{ company.channelConnected ? "подключён" : "нет" }}
                  </span>
                </td>
                <td class="px-6 py-4 text-right">
                  <span
                    class="inline-flex rounded-full px-2.5 py-1 text-xs font-semibold"
                    :class="
                      company.status === 'ACTIVE'
                        ? 'bg-moss-500/14 text-moss-500'
                        : 'bg-rose-600/12 text-rose-600'
                    "
                  >
                    {{ company.status === "ACTIVE" ? "Активна" : "Заблокирована" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </DataState>
    </div>

    <section v-if="audit.length" class="surface mt-6 p-6">
      <h2 class="font-display mb-4 text-lg font-extrabold">Журнал действий</h2>
      <ul class="flex flex-col gap-2 text-sm">
        <li v-for="entry in audit" :key="entry.id" class="flex flex-wrap items-baseline gap-2">
          <span class="text-ink-500">{{ formatDateTime(entry.createdAt) }}</span>
          <span class="font-semibold">{{ ACTION_LABEL[entry.action] ?? entry.action }}</span>
          <span class="text-ink-500">{{ entry.adminEmail }}</span>
        </li>
      </ul>
    </section>
  </div>
</template>