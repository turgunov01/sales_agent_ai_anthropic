<script setup lang="ts">
const auth = useAuthStore();
const route = useRoute();

const NAV = [
  { to: "/", label: "Обзор", glyph: "◈" },
  { to: "/leads", label: "Лиды", glyph: "◆" },
  { to: "/conversations", label: "Диалоги", glyph: "❝" },
  { to: "/products", label: "Каталог", glyph: "▦" },
  { to: "/knowledge", label: "База знаний", glyph: "✦" },
  { to: "/settings", label: "Настройки", glyph: "⚙" },
];

const isActive = (path: string): boolean =>
  path === "/" ? route.path === "/" : route.path.startsWith(path);
</script>

<template>
  <aside
    class="flex h-full w-full flex-col justify-between border-r border-sand-200 bg-sand-50 px-4 py-6 lg:w-64"
  >
    <div>
      <NuxtLink to="/" class="mb-9 flex items-center gap-3 px-2">
        <span
          class="flex h-9 w-9 items-center justify-center rounded-xl bg-ink-900 font-display text-sm font-extrabold text-sand-50"
        >
          AI
        </span>
        <span class="leading-tight">
          <span class="block font-display text-sm font-extrabold text-ink-900">Sales Manager</span>
          <span class="block text-xs text-ink-500">{{ auth.company?.name ?? "—" }}</span>
        </span>
      </NuxtLink>

      <nav class="flex flex-col gap-1" aria-label="Основная навигация">
        <NuxtLink
          v-for="item in NAV"
          :key="item.to"
          :to="item.to"
          class="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors"
          :class="
            isActive(item.to)
              ? 'bg-ink-900 text-sand-50'
              : 'text-ink-700 hover:bg-sand-200/70 hover:text-ink-900'
          "
        >
          <span
            class="w-4 text-center text-xs opacity-70 transition-opacity group-hover:opacity-100"
            aria-hidden="true"
            >{{ item.glyph }}</span
          >
          {{ item.label }}
        </NuxtLink>
      </nav>
    </div>

    <div class="surface-quiet px-3 py-3">
      <p class="truncate text-sm font-semibold text-ink-900">{{ auth.user?.fullName }}</p>
      <p class="truncate text-xs text-ink-500">{{ auth.user?.email }}</p>
      <div class="mt-3 flex items-center justify-between gap-2">
        <StatusPill v-if="auth.user" :value="auth.user.role" kind="role" />
        <button type="button" class="text-xs font-semibold text-clay-600 hover:underline" @click="auth.logout()">
          Выйти
        </button>
      </div>
    </div>
  </aside>
</template>