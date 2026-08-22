<script setup lang="ts">
defineProps<{
  eyebrow?: string;
  title: string;
  description?: string;
}>();
</script>

<template>
  <header class="flex flex-wrap items-end justify-between gap-4 pb-6">
    <div class="max-w-2xl">
      <p v-if="eyebrow" class="eyebrow mb-2">{{ eyebrow }}</p>
      <h1 class="font-display text-3xl font-extrabold text-ink-900 sm:text-4xl">{{ title }}</h1>
      <p v-if="description" class="mt-2 text-sm text-ink-500">{{ description }}</p>
    </div>
    <div class="flex items-center gap-2">
      <slot name="actions" />
    </div>
  </header>
</template>