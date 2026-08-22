<script setup lang="ts">
definePageMeta({ layout: "platform" });

const platform = usePlatformAuthStore();
const email = ref("");
const password = ref("");
const pending = ref(false);
const error = ref<string | null>(null);

async function submit(): Promise<void> {
  pending.value = true;
  error.value = null;
  try {
    await platform.login(email.value.trim(), password.value);
    await navigateTo("/platform");
  } catch (caught) {
    const detailed = caught as { data?: { error?: { message?: string } } };
    error.value = detailed?.data?.error?.message ?? "Не удалось войти";
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="mx-auto max-w-md py-10">
    <p class="eyebrow mb-2 text-sand-400">Служебный вход</p>
    <h1 class="font-display mb-1 text-3xl font-extrabold text-sand-50">Платформа</h1>
    <p class="mb-8 text-sm text-sand-400">
      Раздел оператора SaaS. Учётные записи компаний здесь не работают.
    </p>

    <form class="surface flex flex-col gap-4 p-6" novalidate @submit.prevent="submit">
      <div>
        <label class="label" for="opsEmail">Email оператора</label>
        <input id="opsEmail" v-model.trim="email" type="email" class="field" required autocomplete="email" />
      </div>
      <div>
        <label class="label" for="opsPassword">Пароль</label>
        <input
          id="opsPassword"
          v-model="password"
          type="password"
          class="field"
          required
          autocomplete="current-password"
        />
      </div>
      <p
        v-if="error"
        class="rounded-xl border border-rose-600/25 bg-rose-600/6 px-4 py-3 text-sm text-rose-600"
        role="alert"
      >
        {{ error }}
      </p>
      <button type="submit" class="btn btn-primary w-full" :disabled="pending">
        {{ pending ? "Проверяем…" : "Войти" }}
      </button>
    </form>
  </div>
</template>