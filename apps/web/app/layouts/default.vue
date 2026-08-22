<script setup lang="ts">
const sidebarOpen = ref(false);
const route = useRoute();

watch(() => route.path, () => {
  sidebarOpen.value = false;
});
</script>

<template>
  <div class="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
    <div class="hidden lg:block">
      <AppSidebar />
    </div>

    <div
      v-if="sidebarOpen"
      class="fixed inset-0 z-40 bg-ink-900/40 lg:hidden"
      @click="sidebarOpen = false"
    />
    <div
      v-if="sidebarOpen"
      class="fixed inset-y-0 left-0 z-50 w-64 lg:hidden"
    >
      <AppSidebar />
    </div>

    <div class="flex min-h-screen flex-col">
      <header
        class="flex items-center justify-between border-b border-sand-200 bg-sand-50/80 px-4 py-3 backdrop-blur lg:hidden"
      >
        <button type="button" class="btn btn-ghost px-3 py-1.5" @click="sidebarOpen = true">
          Меню
        </button>
        <span class="font-display text-sm font-extrabold">AI Sales Manager</span>
      </header>

      <main class="flex-1 px-4 py-8 sm:px-8 lg:px-10">
        <div class="mx-auto w-full max-w-6xl">
          <slot />
        </div>
      </main>
    </div>
  </div>
</template>