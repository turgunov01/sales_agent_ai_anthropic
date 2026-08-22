<script setup lang="ts">
const platform = usePlatformAuthStore();
const route = useRoute();
</script>

<template>
  <div class="min-h-screen bg-ink-900">
    <header class="border-b border-white/10">
      <div class="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-8">
        <NuxtLink to="/platform" class="flex items-center gap-3">
          <span
            class="flex h-8 w-8 items-center justify-center rounded-lg bg-clay-500 font-display text-xs font-extrabold text-white"
          >
            OP
          </span>
          <span class="leading-tight">
            <span class="block font-display text-sm font-extrabold text-sand-50">
              Платформа
            </span>
            <span class="block text-xs text-sand-400">AI Sales Manager</span>
          </span>
        </NuxtLink>

        <div v-if="platform.admin" class="flex items-center gap-4">
          <NuxtLink
            to="/platform"
            class="text-sm font-medium transition-colors"
            :class="route.path === '/platform' ? 'text-sand-50' : 'text-sand-400 hover:text-sand-50'"
          >
            Компании
          </NuxtLink>
          <span class="hidden text-sm text-sand-400 sm:inline">{{ platform.admin.email }}</span>
          <button
            type="button"
            class="text-xs font-semibold text-clay-400 hover:underline"
            @click="platform.logout()"
          >
            Выйти
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <slot />
    </main>
  </div>
</template>