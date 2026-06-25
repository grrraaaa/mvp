# Карта проекта — SBBOL Demo (MVP)

> **Назначение каждой папки и каждого файла.** Карта фич — [FEATURE_MAP.md](./FEATURE_MAP.md), архитектура — [ARCHITECTURE.md](./ARCHITECTURE.md), API — [API.md](./API.md), модули — [MODULES.md](./MODULES.md).

Проект — **модульный монолит**: один Next.js-фронт + один FastAPI-бэк + Vercel rewrites. Деплой — на Vercel как один проект; локально — два процесса + Postgres.

---

## 0. Корень репозитория `mvp/`

| Файл / папка | Назначение |
|---|---|
| `README.md` | Точка входа для разработчика: описание, быстрый старт, ссылки на документацию |
| `package.json` | Минимальный npm-проект. Используется Vercel'ом только для детекции Next.js (`next` в зависимостях). Реальные зависимости фронта — в `frontend/package.json` |
| `package-lock.json` | Lockfile корневого npm |
| `vercel.json` | Конфиг Vercel: rewrites `/api/*` → `api/index.py`, build-команды |
| `requirements.txt` | Python-зависимости для Vercel-деплоя (прода) |
| `.env.example` | Шаблон env-переменных (`OPENAI_*`, `QWEN_TTS_*`, `IMAGETOTEXT_*`, `POSTGRES_URL`, `SITE_ACCESS_*` и т.п.) |
| `.env` | Локальные секреты — **не коммитится** |
| `.gitignore`, `.gitattributes` | Git-конфигурация |
| `docker-compose.yml` | Dev-стек: `postgres` + `backend` (uvicorn) + `frontend` (next dev) |
| `docs/` | Вся документация проекта (см. раздел 6) |
| `frontend/` | Next.js 15 App Router (см. раздел 3) |
| `backend/` | FastAPI + SQLAlchemy (см. раздел 2) |
| `api/` | Vercel-Python entrypoint — обёртка над `backend/main.py` (см. раздел 4) |
| `ai/` | Статика базы знаний ассистента (см. раздел 5) |
| `scripts/` | Утилиты разработки (см. раздел 7) |
| `node_modules/` | Dev-зависимости корневого npm — игнорируется в обзоре |
| `backend_new.err`, `backend_new.out`, `logs_*.err`, `logs_*.out` | Логи запусков uvicorn / next dev — артефакты отладки |
| `smoke_report*.txt`, `smoke_*.json`, `smoke_cases.json` | Артефакты smoke-тестов (ручные прогонщики сценариев) |
| `search_output.txt`, `token.txt`, `decode_smoke.py`, `search_assistant.py`, `smoke_runner.py`, `run_smoke.ps1`, `test_chat.ps1`, `test_endpoints.ps1`, `test_stream.ps1` | Вспомогательные отладочные скрипты и снимки — вне основной кодовой базы |

---

## 1. Корень `backend/` — FastAPI

| Файл | Назначение |
|---|---|
| `main.py` | **Точка входа бэкенда.** Создаёт FastAPI, регистрирует middleware (CORS, Basic Auth, GZip), подключает все роутеры из `api/`, монтирует статику `assets/`, вызывает `init_db()` при старте |
| `requirements.txt` | Python-зависимости бэкенда для локального запуска |
| `Dockerfile.dev` | Образ backend-контейнера для docker-compose |
| `run_test.py` | Хенд-раннер unit-тестов (использовался до `pytest`) |
| `test_db.py` | Ручная проверка подключения к БД |
| `test_seeds.py` | Ручная проверка seed-скриптов |
| `test_currency.py` | Smoke-тест конвертации валют |

### 1.1 `backend/api/` — HTTP-роутеры

Каждый файл = один FastAPI `APIRouter`. Регистрируются в `main.py` под префиксом `/api/<домен>`.

| Файл | Префикс | Назначение |
|---|---|---|
| `__init__.py` | — | Делает `api/` пакетом |
| `auth.py` | `/api/auth` | Регистрация, логин, гостевой вход, `GET /api/auth/me` — выдача JWT (HS256, 60 мин). Использует `bcrypt` для паролей |
| `banking.py` | `/api/banking` | **Главный роутер банковской логики.** CRUD документов (`/documents`), список контрагентов (`/counterparties`), поиск (`/search`), аналитика (`/analytics/*`), выписка (`/statement`), остатки (`/accounts`, `/summary`), шлюз (`/gateway/*`), уведомления (`/notifications`), услуги (`/services`), тарифы, риск-скор |
| `chat.py` | `/api/chat` | **Главный роутер ассистента.** `POST /api/chat` (auth), `/api/chat/guest` (без auth), стрим-варианты `/api/chat/stream` и `/api/chat/guest/stream`, история `/api/chat/history/{sid}`, сессии `/api/chat/sessions`, удаление. Делегирует в `services/ai/assistant.py::AssistantService` |
| `forms.py` | `/api/forms` | `POST /api/forms/ocr-fill` — приём фото/PDF → парсинг полей → возврат `form_actions`. Схемы берёт из `services/ai/form_schemas.py` |
| `navigation.py` | `/api/navigation` | Хлебные крошки, секции — для UI-навигации |
| `onec.py` | `/api/onec` | Коннектор 1С: статус, sync, preview, batch import (см. `services/onec/`) |
| `products.py` | `/api/products` | Каталог банковских продуктов (кредиты, депозиты, карты). Скоринг через `services/products/product_service.py` |
| `tts.py` | `/api/tts` | `POST /api/tts/speak` — отдаёт MP3 (Qwen / Inworld / Edge / gTTS / Deepgram / Google / Puter), `GET /api/tts/voices`, `/api/tts/status` |
| `admin.py` | `/api/admin` | Админ-эндпоинты (управление seed-данными, метрики) |

### 1.2 `backend/services/` — бизнес-логика

| Подпапка | Роль | Ключевые файлы |
|---|---|---|
| `__init__.py` | Пакет | — |
| `ai/` | **Ядро ассистента.** Pipeline: приём сообщения → intent-classification → ответ | `assistant.py` (главный модуль, ~2300 строк: `AssistantService.process`, `_handle_payment_form_chat`, `_enrich_counterparty_from_db`, `_process_openai`, prompt-builder, character emotion), `form_schemas.py` (загрузка схем платёжных форм), `query_reformulator.py` (нормализация запросов), `cash_forecast.py` (прогноз кассовых разрывов), `knowledge_sources.py` (5 источников: nalog/minfin/pravo/ssf/bgs), `llm_message_format.py` (формат сообщений OpenAI), `__init__.py` |
| `banking/` | **Банковский слой.** Чтение/запись документов, контрагентов, счетов, выписок | `queries.py` (17+ проверок: баланс, поиск, выписка, повтор платежа), `search.py` (`smart_search` через SQL), `analytics.py` (NL-аналитика, графики), `notifications.py` + `dynamic_notifications.py` (SmartNotification, динамические напоминания), `counterparty_risk.py` (риск-скор), `repeat_payment.py` (повтор последнего платежа), `exchange_rates.py` (курсы валют), `pdf_export.py` (выписка в PDF), `services_consult.py` (тарифы, ROI), `gateway_sim.py` (симуляция шлюза СББОЛ) |
| `forms/` | **Заполнение платёжных форм.** Парсинг, валидация, обогащение | `payment_validators.py` (валидация УНП/IBAN/лимита), `number_parse.py` (разбор суммы/даты/номера), `account_resolve.py` (резолв счёта плательщика по последним цифрам), `field_value_formats.py` (форматирование значений полей), `form_fill_segments.py` (нарезка значений полей), `ocr_text_parser.py` (парсер OCR-текста), `ocr_llm_parser.py` (парсинг OCR через LLM) |
| `navigation/` | **Маршрутизация чата → URL** | `demo_routes.py` (30+ правил: «выписка» → `/statement` и т.п.), `navigation_service.py` (breadcrumbs), `__init__.py` |
| `onec/` | **Интеграция с 1С** (демо-эмулятор) | `assistant.py` (intent-обработка: «синхронизировать», «показать данные»), `connector.py` (OData-подобный коннектор), `__init__.py` |
| `ocr/` | **OCR-распознавание фото платёжек** | `recognize.py` (фасад), `ocrspace.py` (провайдер ocr.space), `imagetotext.py` (провайдер ImageToText), `demo_fallback.py` (заглушка без API-ключей — regex-парсинг) |
| `products/` | **Подбор банковских продуктов** | `product_service.py` (матчинг по оборотам, scoring), `__init__.py` |
| `tax/` | **Налоговый календарь и расчёт ФСЗН** | `calendar.py` (дедлайны НДС/ФСЗН по типу org), `__init__.py` |
| `insurance/` | **Страховые рекомендации** | `recommendations.py` (intent `insurance`, уточняющие карточки), `__init__.py` |
| `tts/` | **TTS-провайдеры** (multi-cloud) | `voice_router.py` (главный диспетчер: Qwen → Inworld → Edge → gTTS → Deepgram → Google → Puter), `qwen_tts.py`, `inworld_tts.py`, `edge_tts.py`, `gtts_tts.py`, `deepgram.py`, `google_tts.py` + 7 файлов с каталогами голосов (`*_voices.py`), `text.py` (санитайзер текста для TTS), `errors.py`, `__init__.py` |
| `ui/` | **UI-actions по страницам** (клики ассистента по кнопкам SBBOL) | `page_actions.py` (30+ маршрутов: «открой», «нажми», «создай»), `__init__.py` |
| `sber_links.py` | **Системный промпт ассистента** + whitelist ссылок только на SBBOL (`/payments`, `/statement`, …) | — |

### 1.3 `backend/core/` — инфраструктура

| Файл | Назначение |
|---|---|
| `__init__.py` | Пакет |
| `config.py` | `pydantic-settings`: читает `.env`, валидирует конфиг, отдаёт `Settings` (БД-URL, ключи, секреты) |
| `db_url.py` | Утилита для склейки `POSTGRES_URL` / `DATABASE_URL` с asyncpg-драйвером |
| `dependencies.py` | FastAPI Depends: `get_db` (сессия SQLAlchemy), `get_current_user` (Bearer JWT → User), `user_org_id`, `_org_filter` (фильтр по `org_id`) |
| `permissions.py` | `resolve_app_role`, `is_route_blocked_for_role` (admin блокируется на `/payments/*` и др.) |
| `site_auth.py` | `SiteBasicAuthMiddleware` — глобальный Basic Auth (включается при `SITE_ACCESS_PASSWORD`); исключения `/health`, `/api/health` |
| `tenant.py` | Хелперы tenant-изоляции (по `org_id`) |

### 1.4 `backend/db/` — ORM, миграции, сидинг

| Файл | Назначение |
|---|---|
| `__init__.py` | Пакет |
| `database.py` | Async SQLAlchemy engine + `SessionLocal`, `init_db()` (создаёт таблицы + дефолтные роли при старте) |
| `models.py` | **Все ORM-модели**: `User`, `OrganizationProfile`, `BankAccount`, `BankDocument`, `Counterparty`, `GatewayPayment`, `OneCDocument`, `StatementLine`, `PaymentRequest`, `AnalyticsMonthly`, `SmartNotification`, `TaxDeadline`, `InsuranceProduct`, `BankProduct`, `BankService`, `ChatSession`, `Message` |
| `migrate.py` | Хенд-раннер миграций (без Alembic — `create_all`) |
| `reset.py` | Дроп всех таблиц (для отладки) |
| `seed.py` | **Главный seed-скрипт.** Создаёт демо-org (`demo`/`ip_ivanov`/`buh_plus`), пользователей, контрагентов, документы |
| `seed_*.py` (14 файлов) | Расширенные seed-скрипты по доменам: `seed_comprehensive.py`, `seed_corpo_cards.py`, `seed_dynamic_cleanup.py`, `seed_extended.py`, `seed_features.py`, `seed_info_requests.py`, `seed_notification_links.py`, `seed_onec.py`, `seed_rich.py`, `seed_statement_accounts.py`, `seed_statement_recent.py`, `seed_tenants.py`, `seed_users.py` |

### 1.5 `backend/models/` — Pydantic-схемы

| Файл | Назначение |
|---|---|
| `__init__.py` | Пакет |
| `schemas.py` | **Все API-схемы** (request/response): `User`, `ChatRequest`, `AssistantResponse`, `FormFieldAction`, `UiAction`, `ActionButton`, `BankDocument*`, `Counterparty`, `NavigationStep`, `BankProduct`, `SourceRef`, `ChartSpec`, etc. |

### 1.6 `backend/tests/` — pytest

| Файл | Назначение |
|---|---|
| `conftest.py` | Фикстуры: тестовая БД, тестовый клиент FastAPI |
| `test_assistant_parsers.py` | Парсеры реплик ассистента |
| `test_counterparty_lookup.py` | Резолв контрагентов по имени/УНП |
| `test_demo_routes.py` | Маршруты демо-навигации |
| `test_exchange_rates.py` | Конвертация валют |
| `test_form_fill_segments.py` | Нарезка значений полей формы |
| `test_form_number_parse.py` | Разбор чисел/дат/сумм |
| `test_llm_message_format.py` | Форматирование сообщений OpenAI |
| `test_ocr_recognize.py` | Распознавание OCR |
| `test_query_reformulator.py` | Нормализация запросов |
| `test_voice_router.py` | Маршрутизация TTS-провайдеров |
| `_debug_routes.py` | Хенд-раннер для ручной отладки роутов (не pytest) |

### 1.7 `backend/scripts/` — утилиты

| Файл | Назначение |
|---|---|
| `probe_qwen_tts.py` | Хенд-тест подключения к Qwen TTS с реальным ключом |

### 1.8 `backend/assets/`

| Файл | Назначение |
|---|---|
| `fonts/` | Шрифты для PDF-генерации (выписки) |

---

## 2. Корень `frontend/` — Next.js 15

| Файл | Назначение |
|---|---|
| `package.json` | npm-зависимости и скрипты фронта: `dev`, `build`, `start`, `lint`, `test` (vitest) |
| `package-lock.json` | Lockfile |
| `tsconfig.json` | TypeScript-конфиг: paths-алиасы (`@/*` → `frontend/*`), strict mode |
| `next-env.d.ts` | Автогенерируемый Next.js — типы `Image`, `Link`, etc. |
| `middleware.ts` | **Next.js Edge middleware.** Basic Auth (если `SITE_ACCESS_PASSWORD` задан) — срабатывает до всех страниц/API |
| `manifest.json` | PWA manifest (иконки, имя, theme-color) для mobile install |
| `.env.local` | Локальные env (например, `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`) — **не коммитится** |
| `public/` | Статика, доступная из браузера (см. 2.8) |
| `app/` | App Router страницы (см. 2.1) |
| `components/` | React-компоненты (см. 2.2) |
| `lib/` | Бизнес-логика и утилиты (см. 2.3) |
| `hooks/` | React-хуки (см. 2.4) |
| `store/` | Zustand-сторы (см. 2.5) |
| `types/` | Глобальные TS-типы (см. 2.6) |
| `scripts/` | Скрипты разработки (см. 2.7) |

### 2.1 `frontend/app/` — App Router

Next.js 15 App Router. Каждый `page.tsx` = публичный маршрут. Файлы сгруппированы по разделам банка.

| Путь | Файл | Назначение |
|---|---|---|
| `/` | `page.tsx` | Главная — Dashboard (`DashboardHome`) |
| `/layout.tsx` | `layout.tsx` | Root layout: подключает `ClientRoot`, `AppProviders`, `globals.css` |
| `/login` | `login/page.tsx`, `login/layout.tsx` | Страница логина (`LoginView`) — отдельный layout (без shell) |
| `/learning` | `learning/page.tsx` | Обучающий модуль + каталог команд ИИ (`LearningView`) |
| `/money/[slug]` | `money/[slug]/page.tsx` | Страница денег (динамический slug) |
| `/other` | `other/page.tsx`, `other/documents/page.tsx`, `other/documents/view/page.tsx`, `other/info-requests/page.tsx`, `other/[...slug]/page.tsx` | Раздел «Прочее»: документы, инфо-запросы, catch-all для остальных подразделов |
| `/payments` | `payments/page.tsx` | Индекс раздела (список подразделов) |
| `/payments/instant` | `payments/instant/page.tsx` | **Мгновенный платёж** (форма `INSTANT_PAYMENT_ORDER`, только имя получателя) |
| `/payments/paydocbyn` | `payments/paydocbyn/page.tsx` | Платёжное поручение BYN (форма `PAYDOCBY` с УНП/IBAN получателя) |
| `/payments/paydoccur` | `payments/paydoccur/page.tsx` | Платёжное поручение валютное |
| `/payments/[slug]` | `payments/[slug]/page.tsx` | Catch-all для остальных подразделов платежей |
| `/products` | `products/page.tsx` | Каталог продуктов |
| `/products/[slug]` | `products/[slug]/page.tsx` + `ProductSlugResolver.tsx` | Карточка продукта (resolve через `getStaticProps`) |
| `/products/corpo-card-transfers` | `products/corpo-card-transfers/page.tsx` | Переводы по корпоративным картам |
| `/salary` | `salary/page.tsx`, `salary/[slug]/page.tsx` | Зарплатный проект + подразделы |
| `/services` | `services/page.tsx`, `services/[slug]/page.tsx` | Сервисы (тарифы, эквайринг, заявки) |
| `/services/counterparty` | `services/counterparty/page.tsx` | Карточка риск-скора контрагента (`CounterpartyRiskView`) |
| `/services/onec` | `services/onec/page.tsx` | Коннектор 1С (`OneCImportView`) |
| `/settings` | `settings/page.tsx`, `settings/[slug]/page.tsx` | Настройки |
| `/statement` | `statement/page.tsx`, `statement/[slug]/page.tsx` | Выписка + детали по счёту |

### 2.2 `frontend/components/` — React-компоненты

| Подпапка | Роль | Ключевые компоненты |
|---|---|---|
| `layout/` | Глобальная разводка | `BankingShell.tsx` (основной shell: хедер, сайдбар, flyout), `SbbolAppLayout.tsx` (внутренний SBBOL-layout), `SbbolUiContext.tsx` (контекст UI: тема, плотность), `AppProviders.tsx` (обёртка провайдеров: theme, store, query), `ClientRoot.tsx` (mount без SSR-mismatch) |
| `auth/` | Аутентификация | `AuthGuard.tsx` (клиентский guard: проверка токена, redirect `/login`), `LoginView.tsx` (форма логина) |
| `banking/` | Бизнес-вью банка | `DashboardHome.tsx`, `MoneyView.tsx`, `PaymentsView.tsx`, `PayrollView.tsx`, `StatementView.tsx`, `ServicesView.tsx`, `ProductsView.tsx`, `OtherView.tsx`, `SettingsView.tsx`, `ProductLandingView.tsx`, `ProductDocumentsView.tsx`, `Navbar.tsx`, `Sidebar.tsx`, `Footer.tsx`, `RoleSelector.tsx` (переключение роли UI), `SberBrandLogo.tsx`, `BankingModals.tsx`, `CreateDocumentModal.tsx` (React-модалка создания платежа), `DocumentDetailView.tsx`, `ServiceApplicationModal.tsx` (заявка на сервис), `ExchangeRatesWidget.tsx`, `CounterpartyRiskView.tsx`, `OneCImportView.tsx`, `GatewayStatusBanner.tsx` |
| `dashboard/` | Дашборд | `DashboardHome.tsx` (счета, события, быстрые действия) |
| `assistant/` | **AI-чат и 3D-консультант** | Главные: `AssistantPanel.tsx` (основной чат — отправка сообщений, рендер пузырей, streaming, OCR-кнопка, форма-fill), `AssistantFloatingChat.tsx` (FAB-кнопка + перетаскиваемая панель), `AssistantDockPanel.tsx` (док-вариант чата), `AssistantUiBridge.tsx` (слушает `sber-assistant-action`/`-navigate` события, делает `router.push` + DOM-fill через `[data-assistant-field]`), `FormFillBridge.tsx` (глобальный мост: применение `form_actions` к захваченному SBBOL-DOM), `ChatInput.tsx` (поле ввода + микрофон + 📷), `ChatArchive.tsx` (история чатов), `MessageBubble.tsx` (рендер сообщения), `AssistantPendingIndicator.tsx`, `AssistantChart.tsx` (графики из чата), `ForecastCard.tsx` (карточка прогноза кассы), `ChoiceCards.tsx` (карточки выбора), `ActionButtons.tsx` (CTA-кнопки ответа), `ProductCard.tsx` (карточка банковского продукта), `SourceChips.tsx` (источники данных), `NotificationBanner.tsx` + `NotificationSummary.tsx` (умные напоминания), `WelcomeScreen.tsx` (приветствие + чипы), `VoicePicker.tsx`, `PersonalizationMenu.tsx` (выбор модели ассистента), `CharacterSettings.tsx` (имя, пресет, голос), `RoleCharacterSync.tsx` (синхронизация роли ↔ персонажа), `TtsBootstrap.tsx` (инициализация TTS), `IconAiSpark.tsx`, `AssistantCharacter.tsx` (entry в 3D-сцену консультанта), `character3d/` — отдельная подпапка с 3D (см. ниже) |
| `assistant/character3d/` | **3D-сцена консультанта** | `CharacterAvatar3D.tsx` (обёртка основного аватара), `CharacterRoomScene.tsx` (полная сцена: камера, свет, GLB), `GlbCharacter3D.tsx` (загрузка GLB, липсинг), `WelcomeCharacter3D.tsx` (полноразмерный канвас для welcome), `ModelPreview3D.tsx` (компактное превью для меню), `ModelLoadingPlaceholder.tsx`, `ModelErrorBoundary.tsx`, `PortraitCamera.tsx` (портретная камера), `ProceduralMouth.tsx` (fallback-рот без морф-таргетов), `SpeechBubble3D.tsx`, `Room.tsx`, `StudioBackdrop.tsx`, `HeadStudioBackdrop.tsx` |
| `learning/` | Обучающий модуль | `LearningView.tsx`, `learningContent.ts` (12 категорий × ~10 команд = ~130 запросов) |
| `sbbol/` | **Захваченный SBBOL-интерфейс** | `CapturedSbbolPage.tsx` (рендер raw HTML), `SbbolCapturedRoute.tsx` (обёртка-роутер), `SbbolHydratedBody.tsx` (гидратация), `SbbolRoutePage.tsx` (страница-обёртка), `SbbolPageHeader.tsx`, `SyntheticPageBody.tsx` (синтетический контент), `DocumentTypeSelectionModal.tsx`, `SbbolIcons.tsx`, `SberBusinessLogo.tsx` |
| `ui/` | UI-обвязка | `AfterHydration.tsx` (mount после гидратации) |

### 2.3 `frontend/lib/` — утилиты и бизнес-логика

| Подпапка / файл | Назначение |
|---|---|
| `api/` | HTTP-клиенты к бэкенду |
| `api/baseUrl.ts` | `apiUrl()` — same-origin на Vercel, `NEXT_PUBLIC_API_URL` локально |
| `api/auth.ts` | `loginRequest`, `registerRequest`, `guestRequest`, `fetchMe` — JWT-флоу |
| `api/chat.ts` | `sendChatMessage` (auth и guest-варианты), `streamChatMessage` (SSE), `fetchChatHistory` |
| `api/forms.ts` | `ocrFillForm` (отправка фото + form_type) |
| `api/banking.ts` | Все запросы к `/api/banking/*` (документы, контрагенты, выписка, аналитика, шлюз, услуги) |
| `api/tts.ts` | `speak(text, voiceId)` — POST `/api/tts/speak`, получение MP3-blob |
| `assistant/` | **Логика ассистента на фронте** |
| `assistant/formFillRunner.ts` | **Главный раннер заполнения формы.** `applyFormActionsWithRetry` (24×150мс ждёт `.sbbol-orig-root`), `findFieldElement` (по `name=` или placeholder), `applyFieldValue` (нативный setter + dispatch input/change/blur) |
| `assistant/uiBridge.ts` | `EVENT_ONLY_ACTIONS` — действия ассистента, исполняемые как window-события |
| `assistant/revealText.ts`, `assistantSurface.ts`, `assistant/renderMessageContent.tsx` | Посимвольная печать ответа, рендер контента сообщений |
| `assistant/glbCharacter.ts`, `mouthVertexDeform.ts`, `lipSync.ts`, `fitGlbModel.ts`, `filterGlbScene.ts`, `analyzeModel.ts` | Работа с 3D-моделями: загрузка GLB, деформация меша (vertex-lip-sync), таймлайн губ, анализ возможностей модели, фит камеры |
| `assistant/characterPresets.ts`, `characterTypes.ts` | Пресеты персонажа (manager/admin/ip) |
| `assistant/chartImage.ts` | Подготовка изображения графика для отображения |
| `assistant/glbCharacter.test.ts` | Vitest-тесты для GLB-логики |
| `banking/` | Банковские типы и утилиты |
| `banking/types.ts` | TS-типы: `Counterparty`, `BankDocument`, `BankAccount`, etc. |
| `banking/roles.ts` | Маппинг `app_role` ↔ capabilities ↔ character preset |
| `banking/exchangeRates.ts` | Конвертация валют (клиент) |
| `banking/actionRegistry.ts` | Реестр действий ассистента (navigate / fill / click) |
| `banking/documentDeepLink.ts` | Парсинг `?doc=` / `?highlight=` |
| `banking/productCatalog.ts` | Каталог продуктов (демо-данные) |
| `banking/toast.ts` | UI-тосты |
| `banking/demoTime.ts` | «Демо-время» — сдвиг дат для презентаций |
| `sbbol/` | **Захваченный SBBOL: схемы форм, навигация, контент** |
| `sbbol/formContext.ts` | `ROUTE_FORM_MAP`: `/payments/paydocbyn` → `"paydocby"`, и т.п. |
| `sbbol/formSchemas/instant.json`, `paydocby.json`, `paydoccur.json` | JSON-схемы полей платёжных форм (ключи, лейблы, типы) |
| `sbbol/navigation.ts` | `MAIN_NAV` + `SUB_NAV` — sidebar/flyout-меню |
| `sbbol/pageContent.ts` | Контент обычных страниц (заголовки, тексты) |
| `sbbol/syntheticPageContent.ts` | Контент синтетических страниц (когда нет реального SBBOL) |
| `sbbol/assistantQuickChips.ts` | Чипы по `pathname` — что спросить у ассистента |
| `sbbol/sbbolLinks.ts` | Безопасные ссылки на SBBOL |
| `sbbol/fieldHighlight.ts` | Подсветка полей формы (для `?highlight=`) |
| `sbbol/accountPickerDom.ts` | DOM-резолв account-picker (счёт плательщика) |
| `sbbol/paymentDocumentRoutes.ts` | Маршруты платёжных документов |
| `sbbol/origPageRoutes.ts` | Оригинальные маршруты захваченного SBBOL |
| `sbbol/capturedOrigHtml.ts` | HTML-строки захваченного SBBOL |
| `sbbol/capturedOrigStyles.ts` | Стили захваченного SBBOL |
| `sbbol/mockSbbolData.ts` | Демо-данные для подмены |
| `sbbol/stubToast.ts` | Тосты для stub-кнопок (что не реализовано) |
| `sber/` | **Sber-специфичные утилиты** |
| `sber/theme.ts` | Цвета 3D и брендинга |
| `sber/verifiedLinks.ts` | Whitelist ссылок на SBBOL/Сбер |
| `sber/tooltip3d.ts` | 3D-тултипы |
| `tts/` | **TTS на фронте** |
| `tts/assistantVoices.ts` | Каталог голосов ассистента |
| `tts/voiceProvider.ts` | Стратегия выбора провайдера (inworld/qwen/edge/...) |
| `tts/playback.ts` | Проигрывание MP3 + lip-sync timeline |
| `tts/browserSpeech.ts` | Fallback на `speechSynthesis` браузера |
| `tts/cleanTextForTts.ts` | Санитайзер текста для TTS (без markdown/emoji) |
| `tts/prefetchSpeech.ts` | Prefetch озвучки для следующего сообщения |
| `tts/previewVoice.ts` | Превью голоса в UI |
| `tts/matchVoiceForCharacter.ts` | Подбор голоса под пол персонажа |
| `tts/combinedVoices.ts` | Объединение каталогов всех провайдеров |
| `tts/inworld*.ts`, `qwen*.ts`, `edge*.ts`, `gtts*.ts`, `deepgram*.ts`, `google*.ts`, `puter*.ts` | Каталоги голосов по провайдерам |
| `auth/tokenRef.ts` | In-memory копия JWT-токена (обход циклов webpack) |

### 2.4 `frontend/hooks/` — React-хуки

| Файл | Назначение |
|---|---|
| `useIsMobile.ts` | Брейкпойнт 640px → mobile-режим |
| `useWebSpeechInput.ts` | Web Speech API → текст (STT) |
| `useAssistantSpeech.ts` | Озвучка ответа + lip-sync |
| `useAssistantReveal.ts` | Посимвольная печать ответа |
| `useSbbolFormFill.ts` | Обёртка над `formFillRunner` для React-форм |
| `useSbbolPaymentValidation.ts` | Inline-валидация полей платежа (зел/жёлт/красн) |
| `useSbbolOrigPageInteractions.ts` | Перехват кликов на захваченной SBBOL-странице |
| `useSbbolAccountPicker.ts` | Account-picker (счёт плательщика) — autocomplete |
| `useDocumentDeepLink.ts` | Парсинг `?doc=` / `?highlight=` → подсветка полей |
| `useCharacterBehavior.ts` | Состояния 3D-персонажа: idle / talk / walk |
| `useCharacterLocomotion.ts` | Движение персонажа (подход/отход) |
| `useTtsBootstrap.ts` | Инициализация TTS при загрузке |

### 2.5 `frontend/store/` — Zustand-сторы

| Файл | Что хранит |
|---|---|
| `assistantStore.ts` | **Главный стор чата.** `messages[]`, `sessionId`, `navigationPath`, `formActions[]`, `pendingFormFields`, `isLoading`, `formFillStatus`, `suggestedChips[]`, `reformulation`, streaming-буфер |
| `assistantDockStore.ts` | Состояние dock-варианта чата (visible, position) |
| `characterStore.ts` | `name`, `subtitle`, `presets[]` (manager/admin/ip), `settingsOpen` |
| `characterBehaviorStore.ts` | `action` (idle/talk/walk), `speechText`, `lipTimeline`, `talkStartedAt` |
| `modelCapabilitiesStore.ts` | `headPortraitMode`, `hasMorphTargets` — что умеет загруженная GLB |
| `ttsStore.ts` | `enabled`, `voiceId`, `voiceGroups`, `serverTts` |
| `bankingStore.ts` | Кеш банковских данных: `counterparties[]`, `accounts[]`, `documents[]` |
| `authStore.ts` | JWT-токен + `user`, persist в localStorage (`sbbol-auth`) |
| `roleStore.ts` | Текущая UI-роль (manager/admin/ip/businessman) |

### 2.6 `frontend/types/` — глобальные типы

| Файл | Назначение |
|---|---|
| `puter.d.ts` | Декларация `window.puter` (Puter.js browser TTS) |

### 2.7 `frontend/scripts/`

Утилиты разработки (TS-скрипты под `npm run`).

### 2.8 `frontend/public/` — статика

| Папка | Содержимое |
|---|---|
| `models/` | GLB-модели 3D-консультанта: `personage.glb`, `textured_sasha_lady1.glb`, `textured_sasha_lady2.glb` + `README.md` (как их использовать) |
| `sber-orig/` | Захваченный HTML/CSS/JS оригинального SBBOL для `CapturedSbbolPage` |
| `fonts/` | Шрифты (для UI) |
| `images/` | Изображения (иконки, логотипы) |
| `m/` | Прочие медиа |
| `manifest.json` | PWA manifest (см. 2.0) |

---

## 3. Корень `api/` — Vercel Python entrypoint

| Файл | Назначение |
|---|---|
| `index.py` | **Vercel ASGI-handler.** Обёртка вокруг `backend.main:app` для serverless-деплоя. Экспортирует `app = backend.main.app` (или через Mangum/ASGI-bridge) |

---

## 4. Корень `ai/` — база знаний

Статические ассеты, которые подмешиваются в системный промпт ассистента через `services/ai/knowledge_sources.py`.

| Папка | Содержимое |
|---|---|
| `knowledge/` | 5 источников: `nalog` (налоги РБ), `minfin` (Минфин), `pravo` (законодательство), `ssf` (ФСЗН), `bgs` (БГС). Формат — JSON / markdown |

---

## 5. Корень `scripts/` — утилиты

Вспомогательные Python/TS-скрипты вне `backend/` и `frontend/`. Используются для ручного прогона smoke-сценариев, отладки, записи логов.

---

## 6. Корень `docs/` — документация

| Файл | Назначение |
|---|---|
| `README.md` | Оглавление документации |
| `FEATURE_MAP.md` | **Главная карта фич.** Mindmap, матрица фич, все pipeline-диаграммы (Mermaid). Начните отсюда |
| `ARCHITECTURE.md` | C4-контекст, контейнеры, потоки данных, security |
| `MODULES.md` | Обзор frontend/backend модулей |
| `API.md` | Спецификация REST-эндпоинтов |
| `ASSISTANT.md` | AI-консультант: pipeline, режимы, ограничения |
| `ASSISTANT_COMMANDS.md` | Полный каталог ~130 команд ИИ × 12 категорий с маппингом на бэкенд |
| `TTS.md` | TTS: state machine выбора голоса, все 7 провайдеров |
| `CHARACTER_3D.md` | 3D-консультант: GLB, камера, липсинг, освещение |
| `UI.md` | UI/адаптив: shell, breakpoints, FAB-чат, иконки |
| `TECH_STACK.md` | Стек: версии пакетов, переменные окружения |
| `LOCAL_DEV.md` | Локальная разработка: установка, запуск, проверка API |
| `VERCEL_DEPLOY.md` | Деплой на Vercel |
| `WORKFLOW_DEMO.md` | 4 ключевых сценария приёмки демо |
| `TZ-assistant-p1.md` | ТЗ: приоритеты ИИ-помощника P1/P2 |
| `PROJECT_MAP.md` | **Этот файл** — назначение каждой папки и каждого файла |
| `feature-map.tsv`, `feature-map-workflows.tsv` | Таблицы фич и workflow-сценариев (TSV для Excel/Sheets) |
| `diagrams2/` | HTML+SVG диаграммы (use-cases, etc.) — генерируются скриптом |

---

## 7. Корень `scripts/` — утилиты разработки

Локальные скрипты вне основных пакетов:
- `run_smoke.ps1` — запуск smoke-тестов (PowerShell)
- `smoke_runner.py` — то же на Python
- `test_chat.ps1`, `test_endpoints.ps1`, `test_stream.ps1` — ручные curl-проверки
- `search_assistant.py` — REPL-поиск по ассистенту
- `decode_smoke.py` — парсинг smoke-отчётов

---

## 8. Поток запроса end-to-end (краткая карта)

```
Юзер на /payments/paydocbyn
  └─► AssistantPanel.tsx (frontend/components/assistant)
        └─► sendChatMessage() → POST /api/chat
              └─► api/chat.py::chat()
                    └─► AssistantService.process() [services/ai/assistant.py]
                          ├─► demo_routes.py (навигация)
                          ├─► _handle_payment_form_chat() (формы)
                          │     ├─► _merge_form_fill_parsing() (rules + LLM)
                          │     └─► _enrich_counterparty_from_db() [services/banking/queries.py]
                          ├─► handle_banking_query() (банк)
                          ├─► _process_openai() / _process_rules() (LLM fallback)
                          └─► AssistantResponse { form_actions, message, ... }
        └─► applyFormActions() [assistantStore]
              └─► FormFillBridge (глобальный эффект)
                    └─► applyFormActionsWithRetry [lib/assistant/formFillRunner.ts]
                          └─► setNativeValue(input) + dispatchEvent('input','change','blur')
                                └─► SBBOL React перечитывает .value → форма заполнена
```

Подробно — [ARCHITECTURE.md](./ARCHITECTURE.md) и [ASSISTANT.md](./ASSISTANT.md).

---

## 9. Где искать что

| Хочу найти… | Смотри |
|---|---|
| Endpoint API | `backend/api/*.py` + спека [API.md](./API.md) |
| Бизнес-логику ассистента | `backend/services/ai/assistant.py` (~2300 строк) |
| Валидацию платежа | `backend/services/forms/payment_validators.py` |
| Заполнение формы на фронте | `frontend/lib/assistant/formFillRunner.ts` |
| Мост ассистент → DOM | `frontend/components/assistant/FormFillBridge.tsx` |
| UI-действия по страницам | `backend/services/ui/page_actions.py` |
| Маршруты демо | `backend/services/navigation/demo_routes.py` |
| Схему формы платежа | `frontend/lib/sbbol/formSchemas/*.json` |
| Каталог команд ИИ | `frontend/components/learning/learningContent.ts::AI_COMMANDS` |
| 3D-консультант | `frontend/components/assistant/character3d/`, [CHARACTER_3D.md](./CHARACTER_3D.md) |
| TTS-провайдеры | `backend/services/tts/voice_router.py` + [TTS.md](./TTS.md) |
| Банковский слой | `backend/services/banking/*.py` |
| База знаний ассистента | `ai/knowledge/` + `backend/services/ai/knowledge_sources.py` |
| ORM-модели | `backend/db/models.py` |
| API-схемы | `backend/models/schemas.py` |
| Сидинг демо-данных | `backend/db/seed*.py` |
| Zustand-стор | `frontend/store/*.ts` |
| Хуки | `frontend/hooks/*.ts` |
| Утилиты фронта | `frontend/lib/{api,assistant,banking,sbbol,tts,sber,auth}/` |

---

_Документ создан по запросу: «опиши назначение каждой папки и каждого файла». Обновляйте при добавлении/удалении файлов._
