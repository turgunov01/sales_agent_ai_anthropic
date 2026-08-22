<script setup lang="ts">
import type { PaginationMeta, ProductDto } from "@ai-sales/shared";

const api = useApi();
const auth = useAuthStore();

interface ImportReport {
  received: number;
  imported: number;
  updated: number;
  failed: number;
  errors: Array<{ line: number; message: string }>;
}

const products = ref<ProductDto[]>([]);
const categories = ref<string[]>([]);
const meta = ref<PaginationMeta | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const filters = reactive({ q: "", category: "", page: 1 });

const showImport = ref(false);
const csvText = ref("");
const importing = ref(false);
const importReport = ref<ImportReport | null>(null);
const importError = ref<string | null>(null);

const showForm = ref(false);
const saving = ref(false);
const formError = ref<string | null>(null);
const form = reactive({
  name: "",
  category: "",
  price: "",
  description: "",
  imageUrl: "",
});

const CSV_TEMPLATE =
  "external_id,name,description,category,price,currency,stock_status,images,material,color,width_cm\n" +
  "SF-001,Диван «Милан»,Угловой диван,Диваны,7500000,UZS,IN_STOCK,https://cdn.uz/1.jpg,Рогожка,Серый,280";

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const response = await api.getPaged<ProductDto[]>("/products", {
      page: filters.page,
      limit: 20,
      ...(filters.q ? { q: filters.q } : {}),
      ...(filters.category ? { category: filters.category } : {}),
    });
    products.value = response.data;
    meta.value = response.meta ?? null;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить каталог";
  } finally {
    loading.value = false;
  }
}

async function loadCategories(): Promise<void> {
  categories.value = await api.get<string[]>("/products/categories").catch(() => []);
}

async function importCsv(): Promise<void> {
  if (!csvText.value.trim()) return;
  importing.value = true;
  importError.value = null;
  importReport.value = null;
  try {
    importReport.value = await api.postRaw<ImportReport>(
      "/products/import",
      csvText.value,
      "text/csv",
    );
    await Promise.all([load(), loadCategories()]);
  } catch (caught) {
    importError.value = caught instanceof Error ? caught.message : "Импорт не удался";
  } finally {
    importing.value = false;
  }
}

async function createProduct(): Promise<void> {
  saving.value = true;
  formError.value = null;
  try {
    await api.post("/products", {
      name: form.name,
      price: Number(form.price.replace(/\s/g, "")),
      category: form.category || null,
      description: form.description || null,
      images: form.imageUrl ? [form.imageUrl] : [],
    });
    Object.assign(form, { name: "", category: "", price: "", description: "", imageUrl: "" });
    showForm.value = false;
    await Promise.all([load(), loadCategories()]);
  } catch (caught) {
    formError.value = caught instanceof Error ? caught.message : "Не удалось сохранить товар";
  } finally {
    saving.value = false;
  }
}

async function toggleActive(product: ProductDto): Promise<void> {
  error.value = null;
  try {
    await api.patch(`/products/${product.id}`, { active: !product.active });
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось изменить видимость товара";
  }
  await load();
}

let searchTimer: ReturnType<typeof setTimeout> | undefined;
watch(
  () => filters.q,
  () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      filters.page = 1;
      void load();
    }, 350);
  },
);

onMounted(async () => {
  await Promise.all([load(), loadCategories()]);
});
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Каталог"
      title="Товары"
      description="Ассистент показывает клиентам только то, что есть здесь. Цены он берёт отсюда же."
    >
      <template #actions>
        <button
          v-if="auth.canManage"
          type="button"
          class="btn btn-ghost"
          @click="showImport = !showImport"
        >
          Импорт CSV
        </button>
        <button
          v-if="auth.canManage"
          type="button"
          class="btn btn-primary"
          @click="showForm = !showForm"
        >
          Добавить товар
        </button>
      </template>
    </PageHeader>

    <section v-if="showImport" class="surface mb-6 p-6">
      <h2 class="font-display mb-1 text-lg font-extrabold">Импорт каталога</h2>
      <p class="mb-4 text-sm text-ink-500">
        Вставьте CSV. Колонка <code>name</code> обязательна, <code>external_id</code> делает импорт
        повторяемым: повторная загрузка обновит товары, а не создаст дубли. Неизвестные колонки
        станут атрибутами товара.
      </p>

      <textarea
        v-model="csvText"
        class="field min-h-[160px] font-mono text-xs"
        :placeholder="CSV_TEMPLATE"
      />

      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-primary" :disabled="importing" @click="importCsv">
          {{ importing ? "Загружаем…" : "Загрузить" }}
        </button>
        <button type="button" class="btn btn-ghost" @click="csvText = CSV_TEMPLATE">
          Вставить пример
        </button>
      </div>

      <p v-if="importError" class="mt-4 text-sm text-rose-600" role="alert">{{ importError }}</p>

      <div v-if="importReport" class="surface-quiet mt-4 p-4 text-sm">
        <p class="font-semibold">
          Строк: {{ importReport.received }} · добавлено: {{ importReport.imported }} · обновлено:
          {{ importReport.updated }} · с ошибками: {{ importReport.failed }}
        </p>
        <ul v-if="importReport.errors.length" class="mt-2 flex flex-col gap-1 text-rose-600">
          <li v-for="rowError in importReport.errors" :key="rowError.line">
            Строка {{ rowError.line }}: {{ rowError.message }}
          </li>
        </ul>
      </div>
    </section>

    <section v-if="showForm" class="surface mb-6 p-6">
      <h2 class="font-display mb-4 text-lg font-extrabold">Новый товар</h2>
      <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="createProduct">
        <div>
          <label class="label" for="name">Название</label>
          <input id="name" v-model.trim="form.name" class="field" required placeholder="Диван «Милан»" />
        </div>
        <div>
          <label class="label" for="price">Цена, сум</label>
          <input id="price" v-model.trim="form.price" class="field" required inputmode="numeric" placeholder="7500000" />
        </div>
        <div>
          <label class="label" for="category">Категория</label>
          <input id="category" v-model.trim="form.category" class="field" list="categories" placeholder="Диваны" />
          <datalist id="categories">
            <option v-for="category in categories" :key="category" :value="category" />
          </datalist>
        </div>
        <div>
          <label class="label" for="imageUrl">Ссылка на фото</label>
          <input id="imageUrl" v-model.trim="form.imageUrl" class="field" type="url" placeholder="https://…" />
        </div>
        <div class="sm:col-span-2">
          <label class="label" for="description">Описание</label>
          <textarea id="description" v-model.trim="form.description" class="field" rows="2" />
        </div>
        <p v-if="formError" class="text-sm text-rose-600 sm:col-span-2" role="alert">{{ formError }}</p>
        <div class="flex gap-2 sm:col-span-2">
          <button type="submit" class="btn btn-primary" :disabled="saving">
            {{ saving ? "Сохраняем…" : "Сохранить" }}
          </button>
          <button type="button" class="btn btn-ghost" @click="showForm = false">Отмена</button>
        </div>
      </form>
    </section>

    <div class="mb-5 flex flex-wrap items-center gap-3">
      <div class="flex flex-wrap gap-1.5">
        <button
          type="button"
          class="btn px-3 py-1.5 text-xs"
          :class="filters.category === '' ? 'btn-primary' : 'btn-ghost'"
          @click="filters.category = ''; filters.page = 1; load()"
        >
          Все категории
        </button>
        <button
          v-for="category in categories"
          :key="category"
          type="button"
          class="btn px-3 py-1.5 text-xs"
          :class="filters.category === category ? 'btn-primary' : 'btn-ghost'"
          @click="filters.category = category; filters.page = 1; load()"
        >
          {{ category }}
        </button>
      </div>
      <input
        v-model.trim="filters.q"
        class="field ml-auto max-w-xs"
        type="search"
        placeholder="Поиск по названию"
        aria-label="Поиск по каталогу"
      />
    </div>

    <div class="surface overflow-hidden">
      <DataState
        :loading="loading"
        :error="error"
        :empty="products.length === 0"
        empty-title="Каталог пуст"
        empty-hint="Загрузите CSV или добавьте первый товар — без каталога ассистенту нечего предлагать."
      >
        <div class="overflow-x-auto">
          <table class="w-full min-w-[760px] text-left text-sm">
            <thead class="border-b border-sand-200 bg-sand-50">
              <tr class="eyebrow">
                <th class="px-6 py-3 font-semibold">Товар</th>
                <th class="px-4 py-3 font-semibold">Категория</th>
                <th class="px-4 py-3 font-semibold">Цена</th>
                <th class="px-4 py-3 font-semibold">Наличие</th>
                <th class="px-6 py-3 text-right font-semibold">Виден AI</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-sand-200">
              <tr v-for="product in products" :key="product.id" class="hover:bg-sand-50">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <img
                      v-if="product.images[0]"
                      :src="product.images[0]"
                      :alt="product.name"
                      width="44"
                      height="44"
                      loading="lazy"
                      class="h-11 w-11 rounded-lg object-cover"
                    />
                    <span
                      v-else
                      class="flex h-11 w-11 items-center justify-center rounded-lg bg-sand-200 text-xs text-ink-500"
                      aria-hidden="true"
                    >
                      нет
                    </span>
                    <div class="min-w-0">
                      <p class="truncate font-semibold">{{ product.name }}</p>
                      <p class="truncate text-xs text-ink-500">
                        {{ product.externalId ?? "без артикула" }}
                      </p>
                    </div>
                  </div>
                </td>
                <td class="px-4 py-4 text-ink-700">{{ product.category ?? "—" }}</td>
                <td class="px-4 py-4 font-semibold whitespace-nowrap tabular-nums">
                  {{ formatPrice(product.price, product.currency) }}
                </td>
                <td class="px-4 py-4"><StatusPill :value="product.stockStatus" kind="stock" /></td>
                <td class="px-6 py-4 text-right">
                  <button
                    v-if="auth.canManage"
                    type="button"
                    class="text-xs font-semibold"
                    :class="product.active ? 'text-moss-500' : 'text-ink-500'"
                    @click="toggleActive(product)"
                  >
                    {{ product.active ? "Показывается" : "Скрыт" }}
                  </button>
                  <span v-else class="text-xs text-ink-500">
                    {{ product.active ? "Показывается" : "Скрыт" }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div
          v-if="meta && meta.totalPages > 1"
          class="flex items-center justify-between border-t border-sand-200 px-6 py-4 text-sm"
        >
          <span class="text-ink-500">Всего {{ meta.total }} позиций</span>
          <div class="flex gap-2">
            <button
              type="button"
              class="btn btn-ghost px-3 py-1.5 text-xs"
              :disabled="filters.page <= 1"
              @click="filters.page -= 1; load()"
            >
              Назад
            </button>
            <button
              type="button"
              class="btn btn-ghost px-3 py-1.5 text-xs"
              :disabled="filters.page >= meta.totalPages"
              @click="filters.page += 1; load()"
            >
              Вперёд
            </button>
          </div>
        </div>
      </DataState>
    </div>
  </div>
</template>