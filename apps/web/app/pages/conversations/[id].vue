<script setup lang="ts">
import type { ConversationDto, MessageDto } from "@ai-sales/shared";

const api = useApi();
const route = useRoute();
const conversationId = computed(() => String(route.params.id));

const conversation = ref<ConversationDto | null>(null);
const messages = ref<MessageDto[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const actionError = ref<string | null>(null);
const draft = ref("");
const sending = ref(false);

const isHuman = computed(() => conversation.value?.status === "HUMAN_HANDLING");
const isClosed = computed(() => conversation.value?.status === "CLOSED");

const BUBBLE: Record<string, string> = {
  CUSTOMER: "bg-white border border-sand-200 text-ink-900",
  ASSISTANT: "bg-ink-900 text-sand-50",
  MANAGER: "bg-clay-500 text-white",
  SYSTEM: "bg-sand-200 text-ink-500 text-xs",
};

const AUTHOR: Record<string, string> = {
  CUSTOMER: "Клиент",
  ASSISTANT: "AI-ассистент",
  MANAGER: "Менеджер",
  SYSTEM: "Система",
};

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [details, history] = await Promise.all([
      api.get<ConversationDto>(`/conversations/${conversationId.value}`),
      api.get<MessageDto[]>(`/conversations/${conversationId.value}/messages`, { limit: 200 }),
    ]);
    conversation.value = details;
    messages.value = history;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Диалог не найден";
  } finally {
    loading.value = false;
  }
}

async function act(action: "takeover" | "release" | "close"): Promise<void> {
  actionError.value = null;
  try {
    await api.post(`/conversations/${conversationId.value}/${action}`);
    await load();
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : "Действие не выполнено";
  }
}

async function send(): Promise<void> {
  const text = draft.value.trim();
  if (!text || sending.value) return;

  sending.value = true;
  actionError.value = null;
  try {
    await api.post(`/conversations/${conversationId.value}/messages`, { text });
    draft.value = "";
    await load();
  } catch (caught) {
    actionError.value = caught instanceof Error ? caught.message : "Сообщение не отправлено";
  } finally {
    sending.value = false;
  }
}

onMounted(load);
</script>

<template>
  <div>
    <NuxtLink
      to="/conversations"
      class="mb-4 inline-block text-sm font-semibold text-clay-600 hover:underline"
    >
      ← Все диалоги
    </NuxtLink>

    <DataState :loading="loading" :error="error">
      <div v-if="conversation" class="flex flex-col gap-5">
        <header class="surface flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <p class="eyebrow mb-1">Диалог в Telegram</p>
            <h1 class="font-display text-2xl font-extrabold">
              {{ customerName(conversation.customer) }}
            </h1>
            <p class="mt-1 text-sm text-ink-500">
              {{ conversation.customer.phone ?? "телефон не получен" }} ·
              {{ conversation.language === "UZ" ? "узбекский" : "русский" }}
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <StatusPill :value="conversation.status" kind="conversation" />
            <button
              v-if="!isHuman && !isClosed"
              type="button"
              class="btn btn-primary"
              @click="act('takeover')"
            >
              Перехватить
            </button>
            <button v-if="isHuman" type="button" class="btn btn-ghost" @click="act('release')">
              Вернуть AI
            </button>
            <button v-if="!isClosed" type="button" class="btn btn-ghost" @click="act('close')">
              Закрыть
            </button>
          </div>
        </header>

        <p
          v-if="actionError"
          class="rounded-xl border border-rose-600/25 bg-rose-600/6 px-4 py-3 text-sm text-rose-600"
          role="alert"
        >
          {{ actionError }}
        </p>

        <section class="surface flex max-h-[62vh] flex-col gap-4 overflow-y-auto p-6">
          <div
            v-for="message in messages"
            :key="message.id"
            class="flex flex-col gap-1"
            :class="message.role === 'CUSTOMER' ? 'items-start' : 'items-end'"
          >
            <span class="px-1 text-[11px] text-ink-500">
              {{ AUTHOR[message.role] }} · {{ formatDateTime(message.createdAt) }}
            </span>
            <p
              class="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap"
              :class="BUBBLE[message.role]"
            >
              {{ message.content }}
            </p>
          </div>
        </section>

        <form v-if="!isClosed" class="surface flex items-end gap-3 p-4" @submit.prevent="send">
          <label class="sr-only" for="reply">Ответ менеджера</label>
          <textarea
            id="reply"
            v-model="draft"
            class="field min-h-[52px] resize-y"
            rows="2"
            placeholder="Ответить клиенту от имени магазина…"
            @keydown.ctrl.enter="send"
          />
          <button type="submit" class="btn btn-primary shrink-0" :disabled="sending || !draft.trim()">
            {{ sending ? "Отправляем…" : "Отправить" }}
          </button>
        </form>

        <p v-if="!isClosed" class="-mt-2 px-1 text-xs text-ink-500">
          Первый ответ менеджера переводит диалог в ручной режим — ассистент замолчит до кнопки
          «Вернуть AI».
        </p>
      </div>
    </DataState>
  </div>
</template>