---
format: 1080x1920
duration: 52s
message: "24reply — не бот, а менеджер по продажам: работает 24/7 и сам оформляет заявки в вашем Telegram"
arc: Вакансия → Боль → Резюме кандидата → Стажировка → Заявка → ПРИНЯТ → CTA
audience: владельцы бизнесов, продающих услуги
mode: collaborative
---

## Frame 1 — Вакансия

- scene: На бумажном листе машинка печатает «ИЩЕМ МЕНЕДЖЕРА ПО ПРОДАЖАМ», ниже три требования
- duration: 7s
- transition_in: cut
- status: outline
- src: compositions/01-vacancy.html
- blueprint: typewriter-reveal

Хук с первого кадра. Крупно: «ИЩЕМ МЕНЕДЖЕРА ПО ПРОДАЖАМ». Затем требования по строке:
«— отвечать ночью», «— не путать цены», «— без отпусков». Каретка, стук клавиш.

## Frame 2 — Боль

- scene: Три коротких удара текстом: 23:40 / Выходной / Обед — «Клиент написал. Никто не ответил.»
- duration: 5s
- transition_in: cut
- status: outline
- src: compositions/02-pain.html
- blueprint: kinetic-type-beats

Почему вакансия вообще открыта: заявки теряются, когда людей нет на месте.

## Frame 3 — Резюме кандидата

- scene: Лист резюме «Кандидат: 24reply AI», строки печатаются и собираются списком
- duration: 9s
- transition_in: crossfade
- status: outline
- src: compositions/03-resume.html
- blueprint: grid-card-assemble

«График: 24/7» · «Ответ: за секунды» · «Знает: ваш каталог, цены и расписание» · «Выходные: не нужны» ·
«Опыт: 3000 ответов в месяц». Ключ — «не чат-бот, а менеджер».

## Frame 4 — Стажировка

- scene: Телефон с чатом 24reply в Telegram; диалог строится сообщение за сообщением до заявки
- duration: 14s
- transition_in: wipe
- status: outline
- src: compositions/04-internship.html
- blueprint: agent-progress-theater

Метка «СТАЖИРОВКА · 23:40». Клиент: «Сколько стоит услуга и можно записаться на завтра?» → ответ с ценой из каталога →
кнопки-варианты → свободные слоты 11:00 / 14:30 / 18:00 → имя и телефон → «Заявка оформлена ✓».

## Frame 5 — Заявка у менеджера

- scene: Уведомление Manager Bot «🔔 Новая заявка #1042» с кнопками «Подтвердить / Взять в работу»
- duration: 5s
- transition_in: cut
- status: outline
- src: compositions/05-notify.html
- blueprint: device-surface-showcase

Результат стажировки: команда уже знает о заявке.

## Frame 6 — ПРИНЯТ

- scene: Возврат к резюме, удар штампа «ПРИНЯТ», строка «≈83 000 сум/мес · 7 дней бесплатно»
- duration: 5s
- transition_in: cut
- status: outline
- src: compositions/06-hired.html
- blueprint: kinetic-type-beats

Развязка концепции + цена как «зарплата».

## Frame 7 — CTA

- scene: Знак «24ai», 24reply.uz, кнопка «Подключить Telegram», внизу «Powered by Turgunov» со знаком
- duration: 7s
- transition_in: crossfade
- status: outline
- src: compositions/07-cta.html
- blueprint: logo-assemble-lockup

Финальный призыв. Логотип Turgunov Technologies — в отметке «Powered by Turgunov».
