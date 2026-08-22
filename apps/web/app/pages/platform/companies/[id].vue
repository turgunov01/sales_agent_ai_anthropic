<script setup lang="ts">
import type { CompanyDetailDto } from "@ai-sales/shared";

definePageMeta({ layout: "platform" });

const api = usePlatformApi();
const route = useRoute();
const companyId = computed(() => String(route.params.id));

const company = ref<CompanyDetailDto | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);
const busy = ref(false);
const reason = ref("");

const isSuspended = computed(() => company.value?.status === "SUSPENDED");

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    company.value = await api.get<CompanyDetailDto>(`/companies/${companyId.value}`);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Компания не найдена";
  } finally {
    loading.value = false;
  }
}

async function setStatus(status: "ACTIVE" | "SUSPENDED"): Promise<void> {
  if (status === "SUSPENDED") {
    const confirmed = window.confirm(
      "Заблокировать компанию? Сотрудники будут отключены немедленно, бот перестанет отвечать клиентам.",
    );
    if (!confirmed) return;
  }

  busy.value = true;
  actionError.value = null;
  try {
    company.value = await api.post<CompanyDetailDto>(`/companies/${companyId.value}/status`, {
      status,
      reason: reason.value.trim() || null,
    });
    reason.value = "";
    await load();
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : "Не удалось изменить статус";
  } finally {
    busy.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <NuxtLink to="/platform" class="mb-4 inline-block text-sm font-semibold text-clay-400 hover:underline">
      ← Все компании
    </NuxtLink>

    <DataState :loading="loading" :error="error">
      <div v-if="company" class="flex flex-col gap-6">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p class="eyebrow mb-2 text-sand-400">{{ company.slug }}</p>
            <h1 class="font-display text-3xl font-extrabold text-sand-50">{{ company.name }}</h1>
            <p class="mt-1 text-sm text-sand-400">
              Зарегистрирована {{ formatDateTime(company.createdAt) }} ·
              {{ company.phone ?? "телефон не указан" }}
            </p>
          </div>
          <span
            class="inline-flex rounded-full px-3 py-1.5 text-sm font-semibold"
            :class="isSuspended ? 'bg-rose-600/15 text-rose-600' : 'bg-moss-500/15 text-moss-500'"
          >
            {{ isSuspended ? "Заблокирована" : "Активна" }}
          </span>
        </header>

        <p
          v-if="actionError"
          class="rounded-xl border border-rose-600/25 bg-rose-600/8 px-4 py-3 text-sm text-rose-600"
          role="alert"
        >
          {{ actionError }}
        </p>

        <section class="grid gap-3 sm:grid-cols-5">
          <div class="surface p-4">
            <p class="eyebrow">Сотрудников</p>
            <p class="font-display mt-1 text-2xl font-extrabold tabular-nums">{{ company.users }}</p>
          </div>
          <div class="surface p-4">
            <p class="eyebrow">Товаров</p>
            <p class="font-display mt-1 text-2xl font-extrabold tabular-nums">{{ company.products }}</p>
          </div>
          <div class="surface p-4">
            <p class="eyebrow">Диалогов</p>
            <p class="font-display mt-1 text-2xl font-extrabold tabular-nums">
              {{ company.conversations }}
            </p>
          </div>
          <div class="surface p-4">
            <p class="eyebrow">Лидов</p>
            <p class="font-display mt-1 text-2xl font-extrabold tabular-nums">{{ company.leads }}</p>
          </div>
          <div class="surface p-4">
            <p class="eyebrow">Квалифицировано</p>
            <p class="font-display mt-1 text-2xl font-extrabold tabular-nums text-moss-500">
              {{ company.qualifiedLeads }}
            </p>
          </div>
        </section>

        <div class="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <section class="surface p-6">
            <h2 class="font-display mb-4 text-lg font-extrabold">Сотрудники</h2>
            <ul class="divide-y divide-sand-200">
              <li
                v-for="user in company.staff"
                :key="user.id"
                class="flex flex-wrap items-center gap-3 py-3"
              >
                <div class="min-w-0 flex-1">
                  <p class="truncate font-semibold">{{ user.fullName }}</p>
                  <p class="truncate text-sm text-ink-500">{{ user.email }}</p>
                </div>
                <StatusPill :value="user.role" kind="role" />
                <span v-if="!user.isActive" class="text-xs text-ink-500">отключён</span>
                <span class="w-28 text-right text-xs text-ink-500">
                  {{ user.lastLoginAt ? formatRelative(user.lastLoginAt) : "не входил" }}
                </span>
              </li>
            </ul>
          </section>

          <aside class="flex flex-col gap-6">
            <article class="surface p-6">
              <p class="eyebrow mb-3">Канал продаж</p>
              <p class="font-semibold" :class="company.channelConnected ? 'text-moss-500' : 'text-ink-500'">
                {{ company.channelConnected ? "Telegram подключён" : "Бот не подключён" }}
              </p>
              <p class="mt-2 text-sm text-ink-500">
                Последняя активность:
                {{ company.lastActivityAt ? formatRelative(company.lastActivityAt) : "—" }}
              </p>
            </article>

            <article class="surface p-6">
              <p class="eyebrow mb-3">Доступ</p>
              <label class="label" for="reason">Причина (в журнал)</label>
              <input
                id="reason"
                v-model.trim="reason"
                class="field mb-3"
                placeholder="Неоплата, злоупотребление…"
              />
              <button
                v-if="!isSuspended"
                type="button"
                class="btn btn-ghost w-full"
                :disabled="busy"
                @click="setStatus('SUSPENDED')"
              >
                Заблокировать компанию
              </button>
              <button
                v-else
                type="button"
                class="btn btn-primary w-full"
                :disabled="busy"
                @click="setStatus('ACTIVE')"
              >
                Разблокировать
              </button>
              <p class="mt-3 text-xs text-ink-500">
                Блокировка немедленно обрывает сессии сотрудников и останавливает бота.
              </p>
            </article>
          </aside>
        </div>
      </div>
    </DataState>
  </div>
</template>