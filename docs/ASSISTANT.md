# AI-консультант (СберБизнес)

> **Полный каталог команд** (~130 запросов на естественном языке по 12 категориям): [ASSISTANT_COMMANDS.md](./ASSISTANT_COMMANDS.md).
> Тот же каталог в UI — вкладка «Команды ИИ» на странице `/learning`.
> Pipeline и сценарии на диаграммах: [FEATURE_MAP.md §6–8](./FEATURE_MAP.md#6-ai-консультант-pipeline-ответа)

Консультант в демо — **Александр** (мужской) или **Александра** (женский), 3 GLB-модели на выбор. Имя фиксируется пресетом в `characterStore` (`manager-abilities` / `admin-abilities` / `ip-abilities`). Отвечает только в контексте **интернет-банка СберБизнес**, не retail-сайта.

---

## Режимы работы

| Режим | Условие |
|-------|---------|
| **LLM** | Задан `OPENAI_API_KEY` (+ `OPENAI_BASE_URL` для OpenRouter) |
| **Rule-based** | Нет ключа или ошибка API |

Проверка: `GET /api/health` → поле `ai_mode`.

---

## Ограничение тематики (SBBOL)

- Промпт и ссылки: `backend/services/sber_links.py`
- В ответах — внутренние пути демо: `/payments`, `/statement`, `/salary`, …
- Официальный референс продукта: https://sbbol.bps-sberbank.by/
- Retail `sber-bank.by` не используется как целевой сайт в логике чата

---

## Навигация

1. Пользователь пишет запрос («выписка», «зарплатный проект», …).
2. `AssistantService` сопоставляет intent с `demo_routes.py` / `navigation_service.py`.
3. В ответе приходит `navigation_path` — фронт делает `router.push`.
4. Подсветка на 3D-карте: `assistantStore.navigationPath` + `PlanetNavSlider`.

Данные планет: `frontend/lib/sber/planetMap.ts` (URL = маршруты Next.js).

### Полный список маршрутов

30+ правил в `backend/services/navigation/demo_routes.py::_ROUTE_RULES`. Маршруты-«листы» (`/payments/paydocbyn`, `/salary/employees`, …) выигрывают у разделов-«хабов» (`/payments`, `/salary`). Полный список → [ASSISTANT_COMMANDS.md §3.5](./ASSISTANT_COMMANDS.md#35-навигация-15-команд).

---

## Заполнение форм

На страницах платежей (`/payments/paydocbyn`, `/instant`, `/paydoccur`):

- Пользователь: «сумма 100 BYN», «получатель ООО …», «очерёдность 5», «01.06.2026»
- Бэкенд возвращает `form_actions` → `useSbbolFormFill` подставляет значения в DOM
- **УНП и счёт получателя** подставляются из `Counterparty` (PostgreSQL) автоматически (`_enrich_counterparty_from_db`)
- OCR: фото/PDF → `POST /api/forms/ocr-fill` → те же действия
- Pending-режим: одна цифра «1500» подставляется в активное поле формы
- Валидация: `payment_validators.py` проверяет УНП (9 цифр), IBAN (BY), лимит org

Контекст страницы передаётся: `page_route`, `form_type` в `POST /api/chat/guest`.

### Паттерны полей

| Поле | Что распознаётся |
|------|------------------|
| `COMMON_COLUMNS_AMOUNT` | `1500`, `1500 руб`, `100 BYN`, `на сумму 500` |
| `COMMON_COLUMNS_DOC_DATE` | `01.06.2026`, `01/06/26` |
| `COMMON_COLUMNS_DOC_NUMBER` | `123` (только цифры) |
| `PAYMENT_URGENCY` | `очерёдность 5`, `очередность шестая` |
| `PAYMENT_PURPOSE` | Текст после «назначение …» |
| `CONTRAGENT_ID` / `CONTRAGENT_ACCOUNT` | Название контрагента (если ≥ 2 символов и не стоп-слово) |

См. [ASSISTANT_COMMANDS.md §3.7](./ASSISTANT_COMMANDS.md#37-формы-12-команд).

---

## Категории команд (12)

Полный реестр в [ASSISTANT_COMMANDS.md §2](./ASSISTANT_COMMANDS.md#2-категории-12-шт). Краткая сводка:

| № | Категория | Сколько | Источник |
|---|-----------|---------|----------|
| 1 | Платежи | 16 | `assistant.py`, `queries.py` |
| 2 | Документы | 19 | `queries.py::handle_banking_query` |
| 3 | Графики | 8 | `cash_forecast.py`, `analytics.py` |
| 4 | Аналитика | 11 | `queries.py` |
| 5 | Навигация | 30+ | `demo_routes.py` |
| 6 | Сервисы | 13 | `services_consult.py` |
| 7 | Формы | 12 | `_handle_payment_form_chat` |
| 8 | 1С | 10 | `onec/assistant.py` |
| 9 | Напоминания | 9 | `notifications.py` |
| 10 | Кнопки | 20+ | `ui/page_actions.py` |
| 11 | Продукты | 9 | `products/product_service.py` |
| 12 | Страхование | 6 | `insurance/recommendations.py` |

---

## Быстрые подсказки (чипы)

`lib/sbbol/assistantQuickChips.ts` — зависят от `pathname`.

Welcome-чипы по роли (бизнесмен / бухгалтер / ИП) подбираются в `assistant.py::_build_welcome`.

---

## Голосовой ввод

`ChatInput` + `useWebSpeechInput` — Web Speech API, язык `ru-RU`.  
После распознавания текст отправляется как обычное сообщение (`onVoiceComplete`).

---

## Озвучка ответов

После каждого нового ответа ассистента `AssistantPanel` вызывает `speak(content)`. Голос (`qwen-male` / `qwen-female`) подбирается автоматически по полу модели, можно сменить вручную.

См. [TTS.md](./TTS.md).

---

## 3D-поведение

`useCharacterBehavior` — состояния `idle` / `talk`, облачко речи, таймлайн губ.

См. [CHARACTER_3D.md](./CHARACTER_3D.md).

---

## Knowledge Q&A (LLM + citations)

Для вопросов по налогам/ФСЗН/законодательству LLM вызывает tool `cite_knowledge_sources` (5 id: `nalog` / `minfin` / `pravo` / `ssf` / `bgs`). Температура = 0. Строгий формат: только текст + источники.

Триггеры: `налог`, `ндс`, `подоходн`, `фсзн`, `отчётност`, `бухгалтер`, `какие сроки`, `что такое`.

См. [ASSISTANT_COMMANDS.md §7](./ASSISTANT_COMMANDS.md#7-knowledge-qa-llm--citations).

---

## Примеры запросов для теста

| Категория | Запрос | Ожидание |
|-----------|--------|----------|
| Навигация | `выписка по счёту` | `navigation_path`: `/statement` |
| Навигация | `создать платёжное поручение` | `/payments/paydocbyn` |
| Навигация | `зарплата` | `/salary` |
| Форма | `сумма 500` (на `paydocbyn`) | `form_actions: COMMON_COLUMNS_AMOUNT=500` |
| Форма | `Получатель Ромашка, сумма 1500, назначение аренда` | 3 поля одной фразой |
| Форма | `проверь реквизиты платежа` | inline 🔴/🟡/🟢 |
| Баланс | `сколько на счёте?` | Остатки + history + 2 графика |
| Прогноз | `кассовый прогноз на 2 недели` | Line + summary |
| Расходы | `расходы за 2026-03` | Pie по категориям |
| Сравнение | `сравни февраль и март` | Bar |
| Поиск | `найди платежи Иванова` | Список + sources |
| Карточка | `открой карточку Ромашка` | `/services/counterparty?cp=…` |
| Контрагент | `проверь контрагента Ромашка` | Риск-скор |
| Подпись | `подпиши документ и отправь в шлюз` | `sign_latest_and_submit` |
| 1С | `покажи данные из 1С` | Pending + `/other/documents` |
| 1С | `синхронизировать с 1С` | `sync_from_1c()` |
| Напоминание | `активные напоминания` | Список `SmartNotification` |
| Источник | `покажи источник №1` | Открыть документ из session |
| Кнопка | `сбросить фильтры` | `reset-filters` |
| Кнопка | `документы за 2026 год` | `filter-year` |

Полный список в [ASSISTANT_COMMANDS.md §3](./ASSISTANT_COMMANDS.md#3-полный-реестр-команд).

---

## Файлы

| Область | Путь |
|---------|------|
| API | `backend/api/chat.py` |
| Pipeline | `backend/services/ai/assistant.py` |
| Intents (14) | `backend/services/ai/assistant.py::INTENTS` |
| Маршруты демо (30+) | `backend/services/navigation/demo_routes.py` |
| UI-действия по страницам (30+) | `backend/services/ui/page_actions.py` |
| Банковские запросы (17+ проверок) | `backend/services/banking/queries.py` |
| Уведомления | `backend/services/banking/notifications.py` |
| 1С | `backend/services/onec/assistant.py` |
| Страхование | `backend/services/insurance/recommendations.py` |
| Продукты/кредит | `backend/services/products/product_service.py` |
| Сервисы/тарифы/ROI | `backend/services/banking/services_consult.py` |
| Knowledge Q&A | `backend/services/ai/knowledge_sources.py` |
| Графики/прогноз | `backend/services/ai/cash_forecast.py` |
| Ссылки/prompt | `backend/services/sber_links.py` |
| UI чата | `frontend/components/assistant/AssistantPanel.tsx` |
| Плавающий чат | `frontend/components/assistant/AssistantFloatingChat.tsx` |
| Store | `frontend/store/assistantStore.ts` |
| Обучающий модуль (UI) | `frontend/components/learning/LearningView.tsx` |
| Каталог команд (UI) | `frontend/components/learning/learningContent.ts::AI_COMMANDS` |
| Быстрые чипы | `frontend/lib/sbbol/assistantQuickChips.ts` |
