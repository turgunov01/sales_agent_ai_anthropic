<script setup lang="ts">
defineProps<{
  label: string;
  value: string | number;
  hint?: string;
  accent?: boolean;
}>();
</script>

<template>
  <div
    class="surface flex flex-col justify-between gap-6 p-5 transition-transform duration-200 hover:-translate-y-0.5"
    :class="accent ? 'bg-ink-900 text-sand-50 border-ink-900' : ''"
  >
    <p class="eyebrow" :class="accent ? 'text-sand-300' : ''">{{ label }}</p>
    <div>
      <p class="font-display text-4xl leading-none font-extrabold tabular-nums">{{ value }}</p>
      <p v-if="hint" class="mt-2 text-sm" :class="accent ? 'text-sand-300' : 'text-ink-500'">
        {{ hint }}
      </p>
    </div>
  </div>
</template>