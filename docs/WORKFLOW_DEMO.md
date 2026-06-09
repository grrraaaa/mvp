# Workflow демонстрации AI-консультанта Алексей (SBBOL Demo)

> Сценарий для прогона демо: 4 ключевых сценария, для каждого — варианты запросов,
> ожидаемое поведение ассистента, маршрут и контрольные точки.

**Стек:** FastAPI + Next.js 15 + OpenRouter/rule-based fallback.  
**Прод:** https://mvp-beta-umber.vercel.app · **Локально:** http://localhost:3000 (UI) + http://127.0.0.1:8000 (API).  
**Проверка перед стартом:**

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health   # ai_mode, tts, db
Invoke-RestMethod http://127.0.0.1:8000/api/tts/status
```

---

## Легенда

| Символ | Значение |
|--------|----------|
| 🟢     | Базовый сценарий (минимум для приёмки) |
| 🟡     | Расширенный сценарий (LLM / LLM+OCR / TTS) |
| 🔴     | Регрессионный сценарий (то, что чаще всего ломают) |

Для каждого шага даны **варианты запросов** — минимум 3, чтобы можно было сравнить поведение rule-based и LLM.

---

## 1. 🟢 Откроем платежи (навигация в раздел «Расчёты»)

**Цель:** проверить, что ассистент корректно маппит intent «payments» и присылает `navigation_path`,
а фронт через `router.push` открывает нужную страницу + подсвечивает планету на 3D-карте.

### Варианты запросов

| # | Запрос пользователя | Ожидаемый intent | URL | Что проверяем |
|---|---------------------|------------------|-----|---------------|
| 1.1 | «открой платежи» | payments | `/payments` | `navigation_path` в ответе, `ActionButton` с `url: /payments` |
| 1.2 | «покажи расчёты» | payments | `/payments` | То же самое, проверка rule-based (`расчёт`) |
| 1.3 | «создай платёжное поручение в BYN» | payments → paydocbyn | `/payments/paydocbyn` | Конкретный подраздел, **более специфичный маршрут** побеждает |
| 1.4 | «открой мгновенный платёж» | payments → instant | `/payments/instant` | Тонкая разница: «мгновенный» срабатывает раньше «поручение» |
| 1.5 | «перевод в инвалюте» | payments → paydoccur | `/payments/paydoccur` | Альтернативный ключ «инвалют» |
| 1.6 | «контрагенты» | payments → counterparties | `/payments/counterparties` | Подраздел «Контрагенты» |
| 1.7 | «добавь платёжку» | payments | `/payments` | Разговорная форма — должна сработать rule-based |

### Проверки на UI

- [ ] Шапка «Расчёты со Сбер Банком» видна после перехода.
- [ ] На 3D-карте (если открыта) подсвечивается планета «Расчёты» (`assistantStore.navigationPath`).
- [ ] Внизу появляется облачко Алексея «Открываю раздел «Расчёты»…» + лип-синк.
- [ ] TTS озвучивает тот же текст (если включён).

### API-проверка напрямую

```powershell
$body = @{ message = "открой платежи"; page_route = "/" } | ConvertTo-Json
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" -Body $body | Select message, navigation_path
```

**Ожидаемо:** `navigation_path` — массив из 2 шагов: `Главная → Расчёты (/payments)`.

---

## 2. 🟢 Поиск документа / контрагента / отчёта

**Цель:** убедиться, что `smart_search` находит документы по контрагенту/назначению/сумме/дате,
а также понимает, что хочет пользователь — отчёт, платёж или карточку клиента.

### Варианты запросов

| # | Запрос пользователя | Что должен вернуть ассистент | URL / действие |
|---|---------------------|------------------------------|----------------|
| 2.1 | «найди платежи Иванова за март» | Список платежей + кнопки-источники | `/other/documents/view?doc=…` |
| 2.2 | «покажи карточку клиента Ромашка» | Карточка контрагента | `/services/counterparty?cp=…` |
| 2.3 | «найди счёт на 1500 рублей» | Документы с суммой 1500 | `/other/documents/view?doc=…` |
| 2.4 | «отчёт по счёту за март» | Список отчётов (INFO:*) | `/other/info-requests` |
| 2.5 | «открой отчёт № 211» | Конкретный отчёт | `/other/documents/view?doc=info-…` |
| 2.6 | «покажи остаток по счёту» | Баланс по счетам организации (быстрый) | `/statement/account` |
| 2.7 | «источник 1» | Переход к выбранному ранее результату | URL из сохранённого источника |

### Проверки на UI

- [ ] В чате — структурированный ответ «Найдено N … Выберите нужный».
- [ ] Под каждым пунктом — плашка «Источник N: …» (компонент `SourceChips`).
- [ ] Клик по источнику открывает документ / карточку / выписку.
- [ ] Если один хит — авто-навигация (`ui_actions: [{ type: "navigate", target }]`).
- [ ] Если ничего — подсказки (suggested_chips): «Найди платежи Иванова», «Сколько на счёте?».

### API-проверка напрямую

```powershell
# Универсальный поиск
Invoke-RestMethod "http://127.0.0.1:8000/api/banking/search?q=Иванов" `
  -Headers @{ Authorization = "Bearer demo" } | Select -ExpandProperty hits | Select kind, title, url

# По контрагенту (rule в smart_search)
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" `
  -Body (@{ message = "найди счёт на 1500"; page_route = "/other/documents" } | ConvertTo-Json)
```

**Ожидаемо:** `hits` — массив объектов с `kind` ∈ {payment, counterparty, report}, `url` валидный.

### Регрессия 🔴

- [ ] `format_search_response` не падает при пустых `hits` (важно: были изменения, добавлены hints).
- [ ] `search_reports` учитывает `INFO:` префикс.
- [ ] `stopwords` отфильтровывают «найди», «покажи», «за март» (если март явно не ищется).

---

## 3. 🟢 Создание документа (платёжное поручение)

**Цель:** пройти весь сценарий — от навигации в `/payments/paydocbyn` до заполнения полей через чат
и отправки в шлюз.

### Варианты запросов

| # | Запрос пользователя | Шаг | Ожидаемое |
|---|---------------------|-----|-----------|
| 3.1 | «создай платёжку на 1500 рублей» | Навигация + заполнение | `router.push` → `/payments/paydocbyn`, поля заполнены |
| 3.2 | «получатель ООО Ромашка, сумма 8900, назначение аренда офиса» | Множественное заполнение | `form_actions: [...]` для 3 полей |
| 3.3 | «сумма 500» (на странице paydocbyn) | Pending-режим | Подставляет в `COMMON_COLUMNS_AMOUNT` |
| 3.4 | «очередность 3» (на странице paydocbyn) | Pending-режим | Подставляет в `PAYMENT_URGENCY` |
| 3.5 | «проверь реквизиты платежа» (с заполненной формой) | Валидация | Блок `**Проверки:**` с 🔴/🟡/🟢 |
| 3.6 | «подпиши документ и отправь в шлюз» | Финал | `POST /api/banking/documents/{id}/sign` + `submit-gateway` |
| 3.7 | «повтори последний платёж» | Шаблон | Кнопка «Повторить платёж» с предзаполненной суммой и получателем |

### Проверки на UI

- [ ] После «сумма 500» поле в форме реально содержит «500» (через `useSbbolFormFill`).
- [ ] Под полем — подсказка от ассистента («Заполнено: Сумма. Укажите «Назначение платежа»…»).
- [ ] Валидация показывает 🔴 если УНП/счёт пустые или некорректные.
- [ ] После «подпиши» документ меняет статус `На подписи → Проведен`, в `gateway_sim` создаётся запись.

### API-проверка напрямую

```powershell
# 1) Создание черновика
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/banking/documents `
  -Headers @{ Authorization = "Bearer demo" } `
  -Body (@{ type = "Перевод в BYN"; counterparty = "ООО Ромашка"; amount = 8900; currency = "BYN"; status = "Черновик"; purpose = "Аренда офиса" } | ConvertTo-Json) `
  -ContentType "application/json"

# 2) Подписание
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/banking/documents/<docId>/sign `
  -Headers @{ Authorization = "Bearer demo" }

# 3) В шлюз
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/banking/documents/<docId>/submit-gateway `
  -Headers @{ Authorization = "Bearer demo" }
```

### Регрессия 🔴

- [ ] `form_schemas.py` валиден для `paydocbyn`, `paydoccur`, `instant`.
- [ ] Поле с `key == "PAYMENT_PURPOSE"` действительно подставляется (а не `CONTRAGENT_ID`).
- [ ] `_enrich_counterparty_from_db` подтягивает УНП/счёт из БД только если не заполнено.
- [ ] Pending-режим сбрасывается после `complete` статуса.

---

## 4. 🟢 Информационный запрос (отчёты, выписки, остатки, ведомости)

**Цель:** раздел `/other/info-requests` — это **список документов с префиксом `INFO:`**
(выписки, остатки, ведомости, сведения о зачислении). Должно работать и навигацией,
и поиском, и формой создания.

### Варианты запросов

| # | Запрос пользователя | Intent / route | Ожидаемое |
|---|---------------------|----------------|-----------|
| 4.1 | «открой информационные запросы» | info_requests → `/other/info-requests` | `navigation_path` с шагами `Главная → Прочее → Запросы выписки, информации` |
| 4.2 | «информационный запрос» | info_requests → `/other/info-requests` | То же, что 4.1 (важно: прилагательное перед существительным) |
| 4.3 | «запрос информации по счёту» | info_requests | То же |
| 4.4 | «остаток по счету» (на странице) | info_requests / context | Кнопка «Создать документ» → черновик `INFO:Остаток по счету (предварительная информация)` |
| 4.5 | «найди отчёт за март 2026» | search_reports | Список `INFO:*` за март |
| 4.6 | «открой отчёт № 211» | search_reports + view | URL `/other/documents/view?doc=info-demo-draft-211` |
| 4.7 | «отчёт по счёту» | search_reports | Авто-навигация на последний подходящий |

### Проверки на UI

- [ ] На странице `/other/info-requests`:
  - [ ] Хедер «Запросы выписки, информации» (teal).
  - [ ] Кнопка «Создать документ» → создаётся `INFO:Остаток по счету (предварительная информация)` со статусом `Черновик`.
  - [ ] Вкладка «Черновики» (по умолчанию) показывает реальные данные из seed (`info-demo-draft-…`).
  - [ ] Клик по строке → `/other/documents/view?doc=…`.
- [ ] В `DocumentDetailView`:
  - [ ] Хедер «Отчёт / информация по счёту» (распознаётся через `doc.type.startsWith("INFO:")`).
  - [ ] Поля: Вид документа, Счёт, Назначение/период.
  - [ ] Кнопка «Открыть выписку за период» ведёт на `/statement/account?period=month`.

### API-проверка напрямую

```powershell
# Список info-документов организации
Invoke-RestMethod "http://127.0.0.1:8000/api/banking/documents?doc_prefix=INFO:" `
  -Headers @{ Authorization = "Bearer demo" } | Select doc_number, type, status, date

# Конкретный отчёт
Invoke-RestMethod "http://127.0.0.1:8000/api/banking/documents/info-demo-draft-211" `
  -Headers @{ Authorization = "Bearer demo" }

# Поиск
Invoke-RestMethod "http://127.0.0.1:8000/api/banking/search?q=отчет" `
  -Headers @{ Authorization = "Bearer demo" } | Select -ExpandProperty hits | Select kind, title

# Чат
Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" `
  -Body (@{ message = "информационный запрос"; page_route = "/other" } | ConvertTo-Json) `
  | Select message, navigation_path
```

### Регрессия 🔴

- [ ] Запрос **«информационный запрос»** НЕ уходит в `statement` и НЕ возвращает default-ответ.
- [ ] `response_message("info_requests")` возвращает специализированный шаблон (см. фикс ниже).
- [ ] `section_label("info_requests")` возвращает «Запросы выписки, информации» (а не «СберБизнес»).
- [ ] Создание `INFO:*` документа через API устанавливает `amount=0`, `currency="BYN"`.
- [ ] Документы `INFO:` **не** попадают в «обычный» список платежей (фильтр в UI `variant="info"`).

---

## Что поправлено в коде (для бэкенда)

> Чтобы workflow №4 работал стабильно, внесены 3 правки:

| Файл | Что изменилось |
|------|----------------|
| `backend/services/sber_links.py` | Добавлен ключ `"info_requests"` в `RESPONSE_TEMPLATES` и в `PLANET_LABELS` |
| `backend/services/ai/assistant.py` | В `INTENTS["info_requests"]` добавлен паттерн `r"информационн\w*\s+запрос"`; intent переставлен выше `statement` (приоритет) |
| `backend/services/navigation/demo_routes.py` | В `_ROUTE_RULES["/other/info-requests"]` добавлен паттерн `r"информационн\w*\s+запрос"` |

---

## Чек-лист приёмки демо

| # | Сценарий | Rule-based | LLM (если есть ключ) | TTS | 3D |
|---|----------|:----------:|:--------------------:|:---:|:--:|
| 1 | Платежи → навигация | ☐ | ☐ | ☐ | ☐ |
| 2 | Поиск документа | ☐ | ☐ | ☐ | — |
| 3 | Создание платежа | ☐ | ☐ | ☐ | — |
| 4 | Информационный запрос | ☐ | ☐ | ☐ | — |

**Smoke-тест за 2 минуты:**

```powershell
# 1) Платежи
$r = Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" -Body '{"message":"открой платежи"}'
$r.navigation_path[-1].url   # -> /payments

# 2) Поиск
$r = Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" -Body '{"message":"найди платежи Иванова"}'
$r.message  # -> "Найдено N платежей..."

# 3) Создание
$r = Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" -Body '{"message":"сумма 500","page_route":"/payments/paydocbyn","form_type":"paydocbyn"}'
$r.form_actions[0].field      # -> поле суммы
$r.form_actions[0].value      # -> "500"

# 4) Информационный запрос
$r = Invoke-RestMethod -Method Post http://127.0.0.1:8000/api/chat/guest `
  -ContentType "application/json" -Body '{"message":"информационный запрос"}'
$r.navigation_path[-1].url    # -> /other/info-requests
$r.message                    # -> "Открываю раздел «Запросы выписки, информации»…"
```

---

## Связанные документы

- [FEATURE_MAP.md](./FEATURE_MAP.md) — mindmap, pipeline, матрица фич
- [ASSISTANT.md](./ASSISTANT.md) — режимы LLM/rules, ограничение SBBOL
- [API.md](./API.md) — REST API
- [LOCAL_DEV.md](./LOCAL_DEV.md) — запуск
