<script setup lang="ts">
import type { AiSettingsDto, ChannelDto, UserDto } from "@ai-sales/shared";

const api = useApi();
const auth = useAuthStore();

const channels = ref<ChannelDto[]>([]);
const employees = ref<UserDto[]>([]);
const settings = ref<AiSettingsDto | null>(null);

const loading = ref(true);
const error = ref<string | null>(null);
const notice = ref<string | null>(null);

const botToken = ref("");
const connecting = ref(false);
const channelError = ref<string | null>(null);

const savingAi = ref(false);
const newEmployee = reactive({ email: "", fullName: "", password: "", role: "MANAGER" });
const employeeError = ref<string | null>(null);

// Открепённый канал остаётся в базе ради истории диалогов,
// но подключённым не считается — иначе не вставить токен нового бота.
const telegram = computed(() =>
  channels.value.find((channel) => channel.type === "TELEGRAM" && channel.isActive),
);
const detached = computed(() =>
  channels.value.find((channel) => channel.type === "TELEGRAM" && !channel.isActive),
);
const showConnectForm = ref(false);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [channelList, staff, ai] = await Promise.all([
      api.get<ChannelDto[]>("/channels"),
      api.get<UserDto[]>("/employees"),
      api.get<AiSettingsDto>("/company/ai-settings"),
    ]);
    channels.value = channelList;
    employees.value = staff;
    settings.value = ai;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить настройки";
  } finally {
    loading.value = false;
  }
}

async function connectTelegram(): Promise<void> {
  connecting.value = true;
  channelError.value = null;
  try {
    await api.post("/channels/telegram", { botToken: botToken.value.trim() });
    botToken.value = "";
    showConnectForm.value = false;
    notice.value = "Бот подключён. Напишите ему в Telegram, чтобы проверить.";
    await load();
  } catch (caught) {
    channelError.value = caught instanceof Error ? caught.message : "Не удалось подключить бота";
  } finally {
    connecting.value = false;
  }
}

async function verifyTelegram(): Promise<void> {
  channelError.value = null;
  try {
    await api.post("/channels/telegram/verify");
    notice.value = "Webhook переустановлен.";
    await load();
  } catch (caught) {
    channelError.value = caught instanceof Error ? caught.message : "Проверка не прошла";
  }
}

async function disconnect(channelId: string): Promise<void> {
  const confirmed = window.confirm(
    "Открепить бота? Он перестанет отвечать клиентам. История диалогов сохранится, " +
      "а токен будет удалён — для возврата понадобится вставить его заново.",
  );
  if (!confirmed) return;

  channelError.value = null;
  try {
    await api.del(`/channels/${channelId}`);
    notice.value = "Бот откреплён. Можно подключить нового.";
    showConnectForm.value = true;
  } catch (caught) {
    channelError.value = caught instanceof Error ? caught.message : "Не удалось открепить бота";
  }
  await load();
}

async function saveAi(): Promise<void> {
  if (!settings.value) return;
  savingAi.value = true;
  try {
    settings.value = await api.put<AiSettingsDto>("/company/ai-settings", {
      enabled: settings.value.enabled,
      assistantName: settings.value.assistantName,
      tone: settings.value.tone,
      greeting: settings.value.greeting,
      systemInstructions: settings.value.systemInstructions,
      autoCreateLead: settings.value.autoCreateLead,
      temperature: settings.value.temperature,
    });
    notice.value = "Настройки ассистента сохранены.";
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось сохранить настройки";
  } finally {
    savingAi.value = false;
  }
}

async function addEmployee(): Promise<void> {
  employeeError.value = null;
  try {
    await api.post("/employees", { ...newEmployee });
    Object.assign(newEmployee, { email: "", fullName: "", password: "", role: "MANAGER" });
    employees.value = await api.get<UserDto[]>("/employees");
  } catch (caught) {
    employeeError.value = caught instanceof Error ? caught.message : "Не удалось добавить сотрудника";
  }
}

async function removeEmployee(id: string): Promise<void> {
  employeeError.value = null;
  try {
    await api.del(`/employees/${id}`);
    employees.value = employees.value.filter((employee) => employee.id !== id);
  } catch (caught) {
    employeeError.value = caught instanceof Error ? caught.message : "Не удалось удалить сотрудника";
  }
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Компания"
      title="Настройки"
      description="Канал продаж, поведение ассистента и доступы сотрудников."
    />

    <p
      v-if="notice"
      class="mb-5 rounded-xl border border-moss-500/30 bg-moss-500/8 px-4 py-3 text-sm text-moss-500"
      role="status"
    >
      {{ notice }}
    </p>

    <DataState :loading="loading" :error="error">
      <div class="flex flex-col gap-6">
        <section class="surface p-6">
          <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="font-display text-lg font-extrabold">Telegram</h2>
              <p class="text-sm text-ink-500">Первый и основной канал продаж.</p>
            </div>
            <StatusPill v-if="telegram" value="ACTIVE" kind="conversation" />
            <StatusPill v-else-if="detached" value="CLOSED" kind="conversation" />
          </div>

          <div v-if="telegram && !showConnectForm" class="surface-quiet p-4">
            <dl class="grid gap-4 sm:grid-cols-3">
              <div>
                <dt class="eyebrow">Бот</dt>
                <dd class="mt-1 font-semibold">@{{ telegram.botUsername ?? "неизвестно" }}</dd>
              </div>
              <div>
                <dt class="eyebrow">Токен</dt>
                <dd class="mt-1 font-mono text-sm">{{ telegram.maskedToken }}</dd>
              </div>
              <div>
                <dt class="eyebrow">Подключён</dt>
                <dd class="mt-1 text-sm">{{ formatDateTime(telegram.lastConnectedAt) }}</dd>
              </div>
            </dl>
            <p class="mt-3 font-mono text-xs break-all text-ink-500">{{ telegram.webhookUrl }}</p>

            <div v-if="auth.canManage" class="mt-4 flex flex-wrap gap-2">
              <button type="button" class="btn btn-ghost" @click="verifyTelegram">
                Переустановить webhook
              </button>
              <button type="button" class="btn btn-ghost" @click="showConnectForm = true">
                Заменить бота
              </button>
              <button type="button" class="btn btn-ghost" @click="disconnect(telegram.id)">
                Открепить бота
              </button>
            </div>
          </div>

          <div v-else-if="auth.canManage">
            <p v-if="detached && !telegram" class="mb-3 text-sm text-ink-500">
              Прежний бот откреплён, его токен удалён. История диалогов сохранена.
            </p>
            <p v-else-if="telegram" class="mb-3 text-sm text-ink-500">
              Новый токен заменит текущего бота @{{ telegram.botUsername }}. Вебхук прежнего бота
              будет снят автоматически.
            </p>

            <form class="flex flex-col gap-3 sm:flex-row sm:items-end" @submit.prevent="connectTelegram">
              <div class="flex-1">
                <label class="label" for="botToken">Токен бота от @BotFather</label>
                <input
                  id="botToken"
                  v-model.trim="botToken"
                  class="field font-mono"
                  placeholder="123456789:AAE…"
                  required
                />
              </div>
              <button type="submit" class="btn btn-primary" :disabled="connecting">
                {{ connecting ? "Подключаем…" : "Подключить" }}
              </button>
              <button
                v-if="telegram"
                type="button"
                class="btn btn-ghost"
                @click="showConnectForm = false"
              >
                Отмена
              </button>
            </form>
          </div>

          <p v-else class="text-sm text-ink-500">Канал не подключён. Обратитесь к владельцу.</p>

          <p v-if="channelError" class="mt-3 text-sm text-rose-600" role="alert">
            {{ channelError }}
          </p>
        </section>

        <section v-if="settings" class="surface p-6">
          <h2 class="font-display mb-4 text-lg font-extrabold">Ассистент</h2>

          <form class="grid gap-5 sm:grid-cols-2" @submit.prevent="saveAi">
            <div>
              <label class="label" for="assistantName">Имя ассистента</label>
              <input
                id="assistantName"
                v-model.trim="settings.assistantName"
                class="field"
                :disabled="!auth.canManage"
              />
            </div>
            <div>
              <label class="label" for="tone">Тон общения</label>
              <input
                id="tone"
                v-model.trim="settings.tone"
                class="field"
                :disabled="!auth.canManage"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="greeting">Приветствие</label>
              <input
                id="greeting"
                v-model="settings.greeting as string"
                class="field"
                :disabled="!auth.canManage"
                placeholder="Здравствуйте! Чем могу помочь?"
              />
            </div>
            <div class="sm:col-span-2">
              <label class="label" for="instructions">Инструкции ассистенту</label>
              <textarea
                id="instructions"
                v-model="settings.systemInstructions as string"
                class="field"
                rows="3"
                :disabled="!auth.canManage"
                placeholder="Всегда предлагай бесплатный замер. Не обещай скидок."
              />
            </div>

            <label class="surface-quiet flex items-start gap-3 p-4 text-sm">
              <input v-model="settings.enabled" type="checkbox" class="mt-0.5" :disabled="!auth.canManage" />
              <span>
                <span class="font-semibold">Ассистент отвечает клиентам</span>
                <span class="mt-0.5 block text-ink-500">
                  Выключите, чтобы диалоги вели только менеджеры.
                </span>
              </span>
            </label>

            <label class="surface-quiet flex items-start gap-3 p-4 text-sm">
              <input
                v-model="settings.autoCreateLead"
                type="checkbox"
                class="mt-0.5"
                :disabled="!auth.canManage"
              />
              <span>
                <span class="font-semibold">Создавать лид автоматически</span>
                <span class="mt-0.5 block text-ink-500">
                  Лид появляется, как только клиент проявил интерес.
                </span>
              </span>
            </label>

            <div v-if="auth.canManage" class="sm:col-span-2">
              <button type="submit" class="btn btn-primary" :disabled="savingAi">
                {{ savingAi ? "Сохраняем…" : "Сохранить настройки" }}
              </button>
            </div>
          </form>
        </section>

        <section class="surface p-6">
          <h2 class="font-display mb-4 text-lg font-extrabold">Сотрудники</h2>

          <ul class="mb-6 divide-y divide-sand-200">
            <li
              v-for="employee in employees"
              :key="employee.id"
              class="flex flex-wrap items-center gap-3 py-3"
            >
              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ employee.fullName }}</p>
                <p class="truncate text-sm text-ink-500">{{ employee.email }}</p>
              </div>
              <StatusPill :value="employee.role" kind="role" />
              <span v-if="!employee.isActive" class="text-xs text-ink-500">отключён</span>
              <button
                v-if="auth.isOwner && employee.id !== auth.user?.id"
                type="button"
                class="text-xs font-semibold text-rose-600 hover:underline"
                @click="removeEmployee(employee.id)"
              >
                Удалить
              </button>
            </li>
          </ul>

          <form
            v-if="auth.canManage"
            class="grid gap-4 border-t border-sand-200 pt-5 sm:grid-cols-2"
            @submit.prevent="addEmployee"
          >
            <div>
              <label class="label" for="employeeName">Имя</label>
              <input id="employeeName" v-model.trim="newEmployee.fullName" class="field" required />
            </div>
            <div>
              <label class="label" for="employeeEmail">Email</label>
              <input
                id="employeeEmail"
                v-model.trim="newEmployee.email"
                type="email"
                class="field"
                required
              />
            </div>
            <div>
              <label class="label" for="employeePassword">Пароль</label>
              <input
                id="employeePassword"
                v-model="newEmployee.password"
                type="password"
                class="field"
                required
                placeholder="Не короче 8 символов"
              />
            </div>
            <div>
              <label class="label" for="employeeRole">Роль</label>
              <select id="employeeRole" v-model="newEmployee.role" class="field">
                <option value="MANAGER">Менеджер</option>
                <option value="ADMIN">Администратор</option>
                <option v-if="auth.isOwner" value="OWNER">Владелец</option>
              </select>
            </div>
            <p v-if="employeeError" class="text-sm text-rose-600 sm:col-span-2" role="alert">
              {{ employeeError }}
            </p>
            <div class="sm:col-span-2">
              <button type="submit" class="btn btn-ghost">Добавить сотрудника</button>
            </div>
          </form>
        </section>
      </div>
    </DataState>
  </div>
</template>