<script setup lang="ts">
definePageMeta({ layout: "blank" });

const auth = useAuthStore();
const route = useRoute();

const mode = ref<"login" | "register">("login");
const pending = ref(false);
const error = ref<string | null>(null);

const form = reactive({
  companyName: "",
  fullName: "",
  email: "",
  password: "",
  phone: "",
});

const isRegister = computed(() => mode.value === "register");
const title = computed(() => (isRegister.value ? "Подключите магазин" : "Вход в кабинет"));

async function submit(): Promise<void> {
  pending.value = true;
  error.value = null;
  try {
    if (isRegister.value) {
      await auth.register({
        companyName: form.companyName,
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        ...(form.phone ? { phone: form.phone } : {}),
      });
    } else {
      await auth.login(form.email, form.password);
    }
    const redirect = typeof route.query.redirect === "string" ? route.query.redirect : "/";
    await navigateTo(redirect);
  } catch (caught) {
    error.value =
      caught instanceof Error ? caught.message : "Не удалось выполнить вход. Попробуйте ещё раз.";
    const detailed = caught as { data?: { error?: { message?: string; details?: Array<{ message: string }> } } };
    const apiMessage = detailed?.data?.error?.message;
    const firstDetail = detailed?.data?.error?.details?.[0]?.message;
    if (apiMessage) error.value = firstDetail ? `${apiMessage}: ${firstDetail}` : apiMessage;
  } finally {
    pending.value = false;
  }
}
</script>

<template>
  <div class="grid w-full max-w-5xl gap-10 lg:grid-cols-[1.1fr_1fr] lg:items-center">
    <section class="hidden lg:block">
      <p class="eyebrow mb-4">AI Sales Manager</p>
      <h1 class="font-display text-5xl leading-[1.05] font-extrabold text-ink-900">
        Продавец, который<br />не спит и не забывает<br />
        <span class="text-clay-500">взять телефон.</span>
      </h1>
      <p class="mt-6 max-w-md text-ink-500">
        Подключите Telegram-бота, загрузите каталог — и ассистент будет консультировать клиентов по
        вашим товарам, квалифицировать лид и передавать сделку менеджеру.
      </p>
      <dl class="mt-10 grid grid-cols-3 gap-4 border-t border-sand-300 pt-6">
        <div>
          <dt class="eyebrow">Каналы</dt>
          <dd class="font-display mt-1 text-2xl font-extrabold">Telegram</dd>
        </div>
        <div>
          <dt class="eyebrow">Языки</dt>
          <dd class="font-display mt-1 text-2xl font-extrabold">RU / UZ</dd>
        </div>
        <div>
          <dt class="eyebrow">Данные</dt>
          <dd class="font-display mt-1 text-2xl font-extrabold">Только ваши</dd>
        </div>
      </dl>
    </section>

    <section class="surface w-full p-7 sm:p-9">
      <h2 class="font-display text-2xl font-extrabold">{{ title }}</h2>
      <p class="mt-1 mb-6 text-sm text-ink-500">
        {{ isRegister ? "Создайте аккаунт компании за минуту." : "Введите email и пароль." }}
      </p>

      <form class="flex flex-col gap-4" novalidate @submit.prevent="submit">
        <template v-if="isRegister">
          <div>
            <label class="label" for="companyName">Название магазина</label>
            <input
              id="companyName"
              v-model.trim="form.companyName"
              class="field"
              required
              autocomplete="organization"
              placeholder="Mebel Style"
            />
          </div>
          <div>
            <label class="label" for="fullName">Ваше имя</label>
            <input
              id="fullName"
              v-model.trim="form.fullName"
              class="field"
              required
              autocomplete="name"
              placeholder="Азиз Каримов"
            />
          </div>
          <div>
            <label class="label" for="phone">Телефон</label>
            <input
              id="phone"
              v-model.trim="form.phone"
              class="field"
              autocomplete="tel"
              placeholder="+998 90 123 45 67"
            />
          </div>
        </template>

        <div>
          <label class="label" for="email">Email</label>
          <input
            id="email"
            v-model.trim="form.email"
            type="email"
            class="field"
            required
            autocomplete="email"
            placeholder="owner@mebelstyle.uz"
          />
        </div>

        <div>
          <label class="label" for="password">Пароль</label>
          <input
            id="password"
            v-model="form.password"
            type="password"
            class="field"
            required
            :autocomplete="isRegister ? 'new-password' : 'current-password'"
            placeholder="Не короче 8 символов"
          />
        </div>

        <p
          v-if="error"
          class="rounded-xl border border-rose-600/25 bg-rose-600/6 px-4 py-3 text-sm text-rose-600"
          role="alert"
        >
          {{ error }}
        </p>

        <button type="submit" class="btn btn-primary mt-1 w-full" :disabled="pending">
          {{ pending ? "Секунду…" : isRegister ? "Создать аккаунт" : "Войти" }}
        </button>
      </form>

      <p class="mt-6 text-center text-sm text-ink-500">
        {{ isRegister ? "Уже есть аккаунт?" : "Впервые здесь?" }}
        <button
          type="button"
          class="font-semibold text-clay-600 hover:underline"
          @click="mode = isRegister ? 'login' : 'register'"
        >
          {{ isRegister ? "Войти" : "Зарегистрировать магазин" }}
        </button>
      </p>
    </section>
  </div>
</template>