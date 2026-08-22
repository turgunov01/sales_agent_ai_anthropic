<script setup lang="ts">
import type { FaqItemDto, KnowledgeBaseDto } from "@ai-sales/shared";

const api = useApi();
const auth = useAuthStore();

const knowledge = reactive<KnowledgeBaseDto>({
  about: null,
  address: null,
  workingHours: null,
  delivery: null,
  payment: null,
  warranty: null,
  managerInstructions: null,
  updatedAt: null,
});

const faq = ref<FaqItemDto[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);
const saving = ref(false);
const saved = ref(false);
const faqDraft = reactive({ question: "", answer: "" });

const FIELDS: Array<{ key: keyof KnowledgeBaseDto; label: string; hint: string; rows: number }> = [
  { key: "about", label: "О компании", hint: "Чем занимаетесь, сколько лет на рынке, чем отличаетесь.", rows: 3 },
  { key: "address", label: "Адрес", hint: "Точный адрес шоурума и ориентир.", rows: 2 },
  { key: "workingHours", label: "График работы", hint: "Дни и часы. Если есть обед — тоже укажите.", rows: 2 },
  { key: "delivery", label: "Доставка", hint: "Условия, стоимость, сроки, подъём на этаж.", rows: 3 },
  { key: "payment", label: "Оплата", hint: "Способы оплаты, рассрочка, предоплата.", rows: 3 },
  { key: "warranty", label: "Гарантия", hint: "Срок и что покрывает.", rows: 2 },
  { key: "managerInstructions", label: "Инструкции ассистенту", hint: "Что всегда уточнять и предлагать.", rows: 3 },
];

const filledCount = computed(
  () => FIELDS.filter((field) => Boolean(knowledge[field.key])).length,
);

async function load(): Promise<void> {
  loading.value = true;
  error.value = null;
  try {
    const [base, questions] = await Promise.all([
      api.get<KnowledgeBaseDto>("/company/knowledge"),
      api.get<FaqItemDto[]>("/company/faq"),
    ]);
    Object.assign(knowledge, base);
    faq.value = questions;
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось загрузить базу знаний";
  } finally {
    loading.value = false;
  }
}

async function save(): Promise<void> {
  saving.value = true;
  saved.value = false;
  error.value = null;
  try {
    await api.put("/company/knowledge", {
      about: knowledge.about,
      address: knowledge.address,
      workingHours: knowledge.workingHours,
      delivery: knowledge.delivery,
      payment: knowledge.payment,
      warranty: knowledge.warranty,
      managerInstructions: knowledge.managerInstructions,
    });
    saved.value = true;
    setTimeout(() => (saved.value = false), 2500);
  } catch (caught) {
    error.value = caught instanceof Error ? caught.message : "Не удалось сохранить";
  } finally {
    saving.value = false;
  }
}

async function addFaq(): Promise<void> {
  if (!faqDraft.question.trim() || !faqDraft.answer.trim()) return;
  await api.post("/company/faq", {
    question: faqDraft.question,
    answer: faqDraft.answer,
    position: faq.value.length,
  });
  faqDraft.question = "";
  faqDraft.answer = "";
  faq.value = await api.get<FaqItemDto[]>("/company/faq");
}

async function removeFaq(id: string): Promise<void> {
  await api.del(`/company/faq/${id}`);
  faq.value = faq.value.filter((item) => item.id !== id);
}

onMounted(load);
</script>

<template>
  <div>
    <PageHeader
      eyebrow="Что знает ассистент"
      title="База знаний"
      description="Ассистенту запрещено выдумывать. Если поле пустое — он честно скажет, что уточнит у менеджера."
    >
      <template #actions>
        <span class="text-sm text-ink-500">{{ filledCount }} из {{ FIELDS.length }} разделов</span>
      </template>
    </PageHeader>

    <DataState :loading="loading" :error="error">
      <div class="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section class="surface p-6">
          <form class="flex flex-col gap-5" @submit.prevent="save">
            <div v-for="field in FIELDS" :key="field.key">
              <label class="label" :for="field.key">{{ field.label }}</label>
              <textarea
                :id="field.key"
                v-model="knowledge[field.key] as string"
                class="field"
                :rows="field.rows"
                :disabled="!auth.canManage"
                :placeholder="field.hint"
              />
            </div>

            <div v-if="auth.canManage" class="flex items-center gap-3">
              <button type="submit" class="btn btn-primary" :disabled="saving">
                {{ saving ? "Сохраняем…" : "Сохранить" }}
              </button>
              <span v-if="saved" class="text-sm font-semibold text-moss-500">Сохранено</span>
            </div>
          </form>
        </section>

        <section class="surface flex flex-col p-6">
          <h2 class="font-display mb-1 text-lg font-extrabold">Частые вопросы</h2>
          <p class="mb-5 text-sm text-ink-500">
            Ассистент отвечает на них дословно вашими формулировками.
          </p>

          <ul v-if="faq.length" class="mb-6 flex flex-col gap-3">
            <li v-for="item in faq" :key="item.id" class="surface-quiet p-4">
              <p class="text-sm font-semibold">{{ item.question }}</p>
              <p class="mt-1 text-sm text-ink-500">{{ item.answer }}</p>
              <button
                v-if="auth.canManage"
                type="button"
                class="mt-2 text-xs font-semibold text-rose-600 hover:underline"
                @click="removeFaq(item.id)"
              >
                Удалить
              </button>
            </li>
          </ul>
          <p v-else class="mb-6 text-sm text-ink-500">Пока ни одного вопроса.</p>

          <form v-if="auth.canManage" class="mt-auto flex flex-col gap-3" @submit.prevent="addFaq">
            <div>
              <label class="label" for="question">Вопрос</label>
              <input
                id="question"
                v-model.trim="faqDraft.question"
                class="field"
                placeholder="Есть ли рассрочка?"
              />
            </div>
            <div>
              <label class="label" for="answer">Ответ</label>
              <textarea
                id="answer"
                v-model.trim="faqDraft.answer"
                class="field"
                rows="2"
                placeholder="Да, до 12 месяцев без переплаты"
              />
            </div>
            <button type="submit" class="btn btn-ghost w-full">Добавить вопрос</button>
          </form>
        </section>
      </div>
    </DataState>
  </div>
</template>