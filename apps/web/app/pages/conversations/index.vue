<script setup lang="ts">
import type { ConversationDto, ConversationStatus } from "@ai-sales/shared";

const api = useApi();

const conversations = ref<ConversationDto[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const status = ref<ConversationStatus | "">("");

const STATUSES: ConversationStatus[] = [
  "HANDOFF_REQUESTED",
  "ACTIVE",
  "HUMAN_HANDLING",
  "CLOSED",
];

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    conversations.value = await api.get<ConversationDto[]>("/conversations", {
      limit: 50,
      ...(status.value ? { status: status.value } : {}),
    });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить диалоги";
  } finally {
    loading.value = false;
  }
}

function filterBy(value: ConversationStatus | ""): void {
  status.value = value;
  void load();
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Инбокс"
      title="Диалоги"
      description="Переписка клиентов с ассистентом. Подключайтесь, когда нужен человек."
    />

    <div class="mb-5 flex flex-wrap gap-1.5">
      <button
        type="button"
        class="btn px-3 py-1.5 text-xs"
        :class="status === '' ? 'btn-primary' : 'btn-ghost'"
        @click="filterBy('')"
      >
        Все
      </button>
      <button
        v-for="value in STATUSES"
        :key="value"
        type="button"
        class="btn px-3 py-1.5 text-xs"
        :class="status === value ? 'btn-primary' : 'btn-ghost'"
        @click="filterBy(value)"
      >
        {{ CONVERSATION_STATUS_LABEL[value] }}
      </button>
    </div>

    <div class="surface overflow-hidden">
      <DataState
        :loading="loading"
        :error="error"
        :empty="conversations.length === 0"
        empty-title="Диалогов пока нет"
        empty-hint="Подключите Telegram-бота в настройках и напишите ему первое сообщение."
      >
        <ul class="divide-y divide-sand-200">
          <li v-for="conversation in conversations" :key="conversation.id">
            <NuxtLink
              :to="`/conversations/${conversation.id}`"
              class="flex flex-wrap items-center gap-4 px-6 py-4 transition-colors hover:bg-sand-50"
            >
              <span
                class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sand-200 font-display text-sm font-extrabold text-ink-700"
              >
                {{ customerName(conversation.customer).slice(0, 1).toUpperCase() }}
              </span>

              <div class="min-w-0 flex-1">
                <p class="truncate font-semibold">{{ customerName(conversation.customer) }}</p>
                <p class="truncate text-sm text-ink-500">
                  {{ conversation.lastMessagePreview || "Сообщений ещё нет" }}
                </p>
              </div>

              <span class="hidden text-xs text-ink-500 sm:inline">
                {{ conversation.language === "UZ" ? "UZ" : "RU" }}
              </span>
              <StatusPill :value="conversation.status" kind="conversation" />
              <span class="w-24 text-right text-xs text-ink-500">
                {{ formatRelative(conversation.lastMessageAt) }}
              </span>
            </NuxtLink>
          </li>
        </ul>
      </DataState>
    </div>
  </div>
</template>