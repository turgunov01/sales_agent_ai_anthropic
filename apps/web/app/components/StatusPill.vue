<script setup lang="ts">
const props = defineProps<{
  value: string;
  kind?: "lead" | "conversation" | "stock" | "role";
}>();

const PALETTE: Record<string, string> = {
  NEW: "bg-sand-200 text-ink-700",
  QUALIFIED: "bg-clay-500/12 text-clay-600",
  CONTACTED: "bg-sky-600/12 text-sky-600",
  WON: "bg-moss-500/14 text-moss-500",
  LOST: "bg-ink-500/10 text-ink-500",
  ACTIVE: "bg-sky-600/12 text-sky-600",
  HANDOFF_REQUESTED: "bg-amber-600/16 text-amber-600",
  HUMAN_HANDLING: "bg-clay-500/12 text-clay-600",
  CLOSED: "bg-ink-500/10 text-ink-500",
  IN_STOCK: "bg-moss-500/14 text-moss-500",
  OUT_OF_STOCK: "bg-rose-600/12 text-rose-600",
  ON_ORDER: "bg-amber-600/16 text-amber-600",
  OWNER: "bg-clay-500/12 text-clay-600",
  ADMIN: "bg-sky-600/12 text-sky-600",
  MANAGER: "bg-sand-200 text-ink-700",
};

const LABELS: Record<string, Record<string, string>> = {
  lead: LEAD_STATUS_LABEL,
  conversation: CONVERSATION_STATUS_LABEL,
  stock: STOCK_LABEL,
  role: ROLE_LABEL,
};

const label = computed(() => LABELS[props.kind ?? "lead"]?.[props.value] ?? props.value);
const tone = computed(() => PALETTE[props.value] ?? "bg-sand-200 text-ink-700");
</script>

<template>
  <span
    class="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap"
    :class="tone"
  >
    {{ label }}
  </span>
</template>