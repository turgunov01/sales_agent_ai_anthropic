<script setup lang="ts">
defineProps<{
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyTitle?: string;
  emptyHint?: string;
}>();
</script>

<template>
  <div v-if="loading" class="flex items-center gap-3 px-6 py-14 text-ink-500">
    <span
      class="h-4 w-4 animate-spin rounded-full border-2 border-sand-300 border-t-clay-500"
      aria-hidden="true"
    />
    <span class="text-sm">Загружаем…</span>
  </div>

  <div
    v-else-if="error"
    class="mx-6 my-8 rounded-xl border border-rose-600/25 bg-rose-600/6 px-5 py-4 text-sm text-rose-600"
    role="alert"
  >
    {{ error }}
  </div>

  <div v-else-if="empty" class="px-6 py-16 text-center">
    <p class="font-display text-lg font-bold text-ink-700">{{ emptyTitle ?? "Пока пусто" }}</p>
    <p v-if="emptyHint" class="mx-auto mt-2 max-w-md text-sm text-ink-500">{{ emptyHint }}</p>
  </div>

  <slot v-else />
</template>