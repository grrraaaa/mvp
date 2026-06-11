# Карта фич — SBBOL Demo (MVP)

Визуальный обзор всего демо **СберБизнес**: интерфейс банка, AI-консультант **Алексей**, 3D-навигация, озвучка, формы и интеграции.

> Учебный проект. Референс UI: [sbbol.bps-sberbank.by](https://sbbol.bps-sberbank.by/) · Прод: [mvp-beta-umber.vercel.app](https://mvp-beta-umber.vercel.app)

---

## 1. Обзор продукта (mindmap)

```mermaid
mindmap
  root((SBBOL Demo))
    Интерфейс банка
      Shell шапка sidebar footer
      8 разделов MAIN_NAV
      Flyout подменю SUB_NAV
      Dashboard счета события
      Захваченный HTML SBBOL
      Синтетические страницы
      Адаптив mobile desktop
      Basic Auth опционально
    AI консультант Алексей
      Плавающий чат FAB
      LLM OpenRouter OpenAI
      Rule-based fallback
      Только контекст SBBOL
      Навигация navigation_path
      Заполнение форм form_actions
      Быстрые чипы по странице
      Голосовой ввод Web Speech
      OCR фото платёжки
    3D
      Карта услуг планеты
      PlanetNavSlider
      GLB personage.glb
      Vertex lip sync
      Портретная камера
    Озвучка TTS
      Speechify ru-RU
      Выбор голоса 50+9
      Soniox Deepgram fallback
      Browser speechSynthesis
    Backend API
      FastAPI guest chat
      TTS voices speak
      OCR forms
      Products Postgres
```

---

## 2. Карта фич по слоям

```mermaid
flowchart TB
    subgraph USER["👤 Пользователь"]
        U1[Текст в чат]
        U2[Голос микрофон]
        U3[Фото документа]
        U4[Клик планета / nav]
        U5[Выбор голоса TTS]
    end

    subgraph FE["🖥 Frontend · Next.js 15"]
        direction TB
        SHELL[SbbolShell]
        PAGES[Страницы /payments …]
        CHAT[AssistantFloatingChat]
        PANEL[AssistantPanel]
        MAP[PlanetMapOverlay]
        CHAR[CharacterRoomScene]
        STORES[Zustand stores]
        SHELL --> PAGES
        CHAT --> PANEL --> CHAR
    end

    subgraph BE["⚙ Backend · FastAPI"]
        CHAT_API["/api/chat/guest"]
        TTS_API["/api/tts/*"]
        OCR_API["/api/forms/ocr-fill"]
        NAV_API["/api/navigation/*"]
        PROD_API["/api/products"]
    end

    subgraph EXT["☁ Внешние сервисы"]
        OR[OpenRouter]
        SP[Speechify]
        OCR[ImageToText]
        DB[(Postgres)]
    end

    U1 & U2 --> CHAT
    U3 --> OCR_API
    U4 --> MAP & SHELL
    U5 --> TTS_API

    CHAT --> CHAT_API
    PANEL --> TTS_API
    CHAT_API --> OR
    TTS_API --> SP
    OCR_API --> OCR
    CHAT_API --> DB
    PROD_API --> DB
```

---

## 3. Матрица фич

| # | Фича | Где в UI | Backend / API | Статус |
|---|------|----------|---------------|--------|
| 1 | **Shell СберБизнес** | `SbbolShell` | — | ✅ |
| 2 | **Sidebar + flyout** | `MAIN_NAV`, `SUB_NAV` | — | ✅ |
| 3 | **Слайдер планет** | `PlanetNavSlider` | — | ✅ |
| 4 | **3D карта услуг** | `PlanetMapOverlay` | `planetMap.ts` | ✅ |
| 5 | **Hover только целевого объекта** | `PlanetLink` | — | ✅ |
| 6 | **Dashboard** | `/`, `DashboardHome` | — | ✅ |
| 7 | **Страницы разделов** | `/payments`, `/statement`, … | — | ✅ |
| 8 | **Формы платежей** | `paydocbyn`, `paydoccur`, `instant` | `form_actions` | ✅ |
| 9 | **AI-чат (guest)** | `AssistantFloatingChat` | `POST /api/chat/guest` | ✅ |
| 10 | **LLM + rules** | ответы ассистента | `assistant.py` | ✅ |
| 11 | **Навигация из чата** | `router.push` | `navigation_path` | ✅ |
| 12 | **Заполнение форм AI** | `useSbbolFormFill` | `form_actions` | ✅ |
| 13 | **OCR с фото** | `ChatInput` 📷 | `POST /api/forms/ocr-fill` | ✅ |
| 14 | **Голосовой ввод** | `useWebSpeechInput` | Web Speech API | ✅ |
| 15 | **3D Алексей** | `GlbCharacter3D` | — | ✅ |
| 16 | **Липсинг vertex** | `mouthVertexDeform` | — | ✅ |
| 17 | **Озвучка Speechify** | `useAssistantSpeech` | `POST /api/tts/speak` | ✅ |
| 18 | **Выбор голоса** | `AssistantVoicePicker` | `GET /api/tts/voices` | ✅ |
| 19 | **Каталог продуктов** | `ProductCard` | `GET /api/products` | ✅ |
| 20 | **Basic Auth** | `middleware.ts` | `SiteBasicAuthMiddleware` | ✅ |
| 21 | **JWT auth** | заготовка | `/api/auth/*` | 🔶 scaffold |
| 22 | **Деплой Vercel** | один домен | `api/index.py` | ✅ |
| 23 | **Обучающий модуль** | `/learning` → `LearningView` | `AI_COMMANDS` (12 категорий, ~130 команд) | ✅ |
| 24 | **Каталог команд ИИ** | вкладка «Команды ИИ» | `learningContent.ts::AI_COMMANDS` | ✅ |

---

## 4. Карта маршрутов (страницы)

```mermaid
flowchart LR
    HOME["/ Dashboard"]

    subgraph PAY["Расчёты"]
        P0["/payments"]
        P1["/payments/paydocbyn"]
        P2["/payments/paydoccur"]
        P3["/payments/instant"]
    end

    subgraph STMT["Выписка"]
        S0["/statement"]
        S1["/statement/account"]
    end

    subgraph SAL["Зарплата"]
        Z0["/salary"]
        Z1["/salary/project"]
        Z2["/salary/obligations"]
    end

    subgraph PRD["Продукты"]
        R0["/products"]
        R1["/products/credits"]
    end

    subgraph SVC["Сервисы"]
        V0["/services"]
    end

    subgraph OTH["Прочее / Настройки"]
        O0["/other"]
        SET["/settings"]
    end

    HOME --> PAY & STMT & SAL & PRD & SVC & OTH
    P0 --> P1 & P2 & P3
```

Полный список slug: `frontend/lib/sbbol/navigation.ts`, контент: `pageContent.ts` / `syntheticPageContent.ts`.

---

## 5. 3D-карта разделов (планеты)

```mermaid
flowchart TB
    SUN((☀ СберБизнес<br/>/))

    SUN --- P1["🪐 Расчёты<br/>/payments"]
    SUN --- P2["🪐 Выписка<br/>/statement"]
    SUN --- P3["🪐 Зарплата<br/>/salary"]
    SUN --- P4["🪐 Продукты<br/>/products"]
    SUN --- P5["🪐 Сервисы<br/>/services"]
    SUN --- P6["🪐 Прочее<br/>/other"]
    SUN --- P7["🪐 Настройки<br/>/settings"]

    P1 --> S11["Спутник: Поручение"]
    P1 --> S12["Спутник: Контрагенты"]
    P2 --> S21["Спутник: По счёту"]
    P2 --> S22["Спутник: Справки"]

    style SUN fill:#21A038,color:#fff
    style P1 fill:#5eb8ff,color:#000
    style P2 fill:#80cbc4,color:#000
    style P3 fill:#ffd54f,color:#000
```

**Поведение:** клик → `router.push(url)` · hover → tooltip **только** у планеты или спутника под курсором · подсветка орбиты из `assistantStore.navigationPath`.

Источник данных: `frontend/lib/sber/planetMap.ts`.

---

## 6. AI-консультант: pipeline ответа

```mermaid
flowchart TD
    IN[Сообщение пользователя<br/>+ page_route + form_type]
    IN --> API[POST /api/chat/guest]

    API --> S1{Демо-навигация?<br/>demo_routes.py}
    S1 -->|intent match| NAV[navigation_path]
    S1 -->|нет| S2{Заполнение формы?<br/>form context}
    S2 -->|да| FORM[form_actions]
    S2 -->|нет| S3{OPENAI_API_KEY?}

    S3 -->|да| LLM[OpenRouter / OpenAI<br/>assistant.py + sber_links]
    S3 -->|нет| RULE[Rule-based regex<br/>+ sber_links SBBOL only]

    LLM -->|ошибка| RULE

    NAV & FORM & LLM & RULE --> OUT[AssistantResponse]
    OUT --> FE[Frontend]

    FE --> MSG[MessageBubble]
    FE --> ROUTE[router.push если path]
    FE --> FILL[useSbbolFormFill]
    FE --> LIP[lipSync + vertex mouth]
    FE --> TTS[useAssistantSpeech]
```

**Ограничение:** промпт и ссылки только **СберБизнес** — внутренние `/…`, не retail-сайт. См. [ASSISTANT.md](./ASSISTANT.md).

---

## 7. Сценарий: от вопроса до озвучки

```mermaid
sequenceDiagram
    autonumber
    actor U as Пользователь
    participant UI as AssistantPanel
    participant API as FastAPI
    participant LLM as OpenRouter
    participant TTS as Speechify
    participant GLB as GlbCharacter3D

    U->>UI: «выписка по счёту»
    UI->>API: POST /api/chat/guest
    API->>API: match demo route
    API-->>UI: message + navigation_path=/statement
    UI->>UI: router.push(/statement)
    UI->>GLB: talk + lip timeline
    UI->>API: POST /api/tts/speak { voice_id }
    API->>TTS: simba-multilingual ru-RU
    TTS-->>UI: MP3
    UI->>U: аудио + анимация рта
```

---

## 8. Мультимодальный ввод в чат

```mermaid
flowchart LR
    subgraph INPUT["Ввод"]
        T[⌨ Текст]
        V[🎤 Голос<br/>Web Speech API]
        F[📷 Фото<br/>ImageToText OCR]
    end

    subgraph CHAT["Чат"]
        CI[ChatInput]
        AP[AssistantPanel]
    end

    subgraph OUT["Результат"]
        R1[Ответ текст]
        R2[Навигация]
        R3[Поля формы]
        R4[Озвучка MP3]
    end

    T --> CI --> AP
    V -->|onVoiceComplete| AP
    F -->|ocr-fill API| AP
    AP --> R1 & R2 & R3 & R4
```

---

## 9. TTS: цепочка провайдеров

```mermaid
flowchart TD
    REQ[POST /api/tts/speak<br/>text + voice_id?]
    REQ --> P1{SPEECHIFY_API_KEY?}
    P1 -->|да| SP[Speechify<br/>simba-multilingual ru-RU]
    P1 -->|нет| P2{SONIOX_API_KEY?}
    P2 -->|да| SX[Soniox TTS]
    P2 -->|нет| P3{DEEPGRAM_API_KEY?}
    P3 -->|да| DG[Deepgram]
    P3 -->|нет| ERR[503 / browser fallback]

    SP --> MP3[audio/mpeg]
    SX --> MP3
    DG --> MP3

    UI[AssistantVoicePicker] -->|GET /voices| VOICES[50 ru + 9 multilingual]
    VOICES --> localStorage[sber-assistant-tts-voice]
    localStorage --> REQ
```

См. [TTS.md](./TTS.md).

---

## 10. 3D-консультант Алексей

```mermaid
flowchart TB
    subgraph CANVAS["CharacterRoomScene"]
        CAM[PortraitCamera<br/>Z≈7.8 Y offset -0.30]
        ORB[OrbitControls 5.2–9.5]
        GLB[GlbCharacter3D<br/>personage.glb]
        LIP[mouthVertexDeform]
        BG[Тёмный фон<br/>без мебели GLB]
    end

    subgraph BEHAVIOR["Поведение"]
        IDLE[idle покачивание]
        TALK[talk + speech bubble]
        TIMELINE[lipSync.ts timeline]
    end

    MSG[Ответ ассистента] --> BEHAVIOR
    BEHAVIOR --> LIP
    TTS_AUDIO[MP3 озвучка] --> CANVAS

    GLB --> LIP
    CAM --> GLB
```

См. [CHARACTER_3D.md](./CHARACTER_3D.md).

---

## 11. Деплой и runtime

```mermaid
flowchart TB
    subgraph VERCEL["Vercel · один проект"]
        NEXT[Next.js build<br/>frontend/]
        PY[Python serverless<br/>api/index.py]
        ENV[Environment Variables]
    end

    USER([Браузер]) -->|HTML JS| NEXT
    USER -->|/api/*| PY
    PY --> MAIN[backend/main.py FastAPI]
    MAIN --> PG[(Vercel Postgres)]
    MAIN --> OR2[OpenRouter]
    MAIN --> SP2[Speechify]

    ENV -.-> NEXT & PY
```

См. [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md).

---

## 12. Zustand stores (состояние UI)

```mermaid
classDiagram
    class assistantStore {
        messages[]
        sessionId
        navigationPath
        isLoading
    }
    class characterStore {
        config name subtitle
        settingsOpen
        presets
    }
    class characterBehaviorStore {
        action idle talk walk
        speechText
        lipTimeline
    }
    class ttsStore {
        enabled
        voiceId
        voiceGroups
        serverTts
    }
    class solarSystemStore {
        frozen
        pauseOffset
    }
    class modelCapabilitiesStore {
        headPortraitMode
        hasMorphTargets
    }

    AssistantPanel --> assistantStore
    AssistantPanel --> characterBehaviorStore
    useAssistantSpeech --> ttsStore
    PlanetMapOverlay --> solarSystemStore
    GlbCharacter3D --> modelCapabilitiesStore
    CharacterSettings --> characterStore
```

---

## 13. Зависимости документации

```mermaid
flowchart LR
    FM[FEATURE_MAP.md<br/>вы здесь]
    FM --> ARCH[ARCHITECTURE.md]
    FM --> ASST[ASSISTANT.md]
    FM --> ASST_C[ASSISTANT_COMMANDS.md<br/>~130 команд × 12 категорий]
    FM --> TTS_D[TTS.md]
    FM --> UI3D[UI_AND_3D.md]
    FM --> CHAR[CHARACTER_3D.md]
    FM --> API_D[API.md]
    FM --> MOD[MODULES.md]
    FM --> DEV[LOCAL_DEV.md]
    FM --> DEP[VERCEL_DEPLOY.md]
    ASST --> ASST_C
```

---

## 14. Быстрые сценарии для демо

| Сценарий | Действие | Ожидание |
|----------|----------|----------|
| Навигация | «выписка по счёту» | `/statement` |
| Форма | на `paydocbyn`: «сумма 500» | поле суммы |
| OCR | фото платёжки | поля формы |
| Голос | 🎤 → фраза | отправка в чат |
| TTS | ответ ассистента | MP3 + губы |
| Голос TTS | выпадающий список | Mikhail / George … |
| 3D карта | hover спутник | один tooltip |
| Планеты | клик «Расчёты» | `/payments` |
| Каталог ИИ | `/learning` → вкладка «Команды ИИ» | 12 категорий, ~130 запросов с фильтром и поиском |

---

## 15. Обучающий модуль и каталог команд ИИ

Страница `/learning` (`frontend/app/learning/page.tsx` → `components/learning/LearningView.tsx`) — это **встроенная документация по ИИ-консультанту** в UI.

```mermaid
flowchart LR
    LP[/learning] --> TAB1[Уроки<br/>LEARNING_MODULES]
    LP --> TAB2[Команды ИИ<br/>AI_COMMANDS]

    TAB1 --> M1[Первые шаги]
    TAB1 --> M2[ИИ-консультант]
    TAB1 --> M3[Графики и аналитика]
    TAB1 --> M4[Заполнение форм]
    TAB1 --> M5[Поиск и документы]
    TAB1 --> M6[Интеграция с 1С]
    TAB1 --> M7[Сервисы и продукты]
    TAB1 --> M8[Кнопки и действия]
    TAB1 --> M9[База знаний и налоги]
    TAB1 --> M10[Напоминания]
    TAB1 --> M11[Платежи / Выписка / Зарплата / Безопасность]

    TAB2 --> C1[Платежи]
    TAB2 --> C2[Документы]
    TAB2 --> C3[Графики]
    TAB2 --> C4[Аналитика]
    TAB2 --> C5[Навигация]
    TAB2 --> C6[Сервисы]
    TAB2 --> C7[Формы]
    TAB2 --> C8[1С]
    TAB2 --> C9[Напоминания]
    TAB2 --> C10[Кнопки]
    TAB2 --> C11[Продукты]
    TAB2 --> C12[Страхование]
```

**12 категорий × ~10 команд = ~130 рабочих запросов на естественном языке**, каждая с:
- краткой формулировкой (`cmd`)
- конкретным примером, который можно скопировать в чат (`example`)
- описанием что делает (`description`)
- фильтром по категории и поиском по подстроке
- кнопкой «Спросить ИИ» — отправляет пример в чат одной кнопкой

**Кнопка «Спросить»** использует `setSuggestedChips([question])` + `openChat()` из `useSbbolUi` — открывает чат с готовым сообщением.

**Прогресс** прохождения уроков сохраняется в `localStorage` (`sbbol_learning_progress`).

Полный реестр команд с backend-маппингом — [ASSISTANT_COMMANDS.md](./ASSISTANT_COMMANDS.md).

---

## Связанные файлы

| Область | Ключевые пути |
|---------|----------------|
| Shell | `components/layout/SbbolShell.tsx` |
| Чат | `components/assistant/*` |
| 3D карта | `components/three/PlanetLink.tsx` |
| AI | `backend/services/ai/assistant.py` |
| Навигация | `backend/services/navigation/demo_routes.py` |
| TTS | `backend/services/tts/` |
| Планеты | `frontend/lib/sber/planetMap.ts` |

Полное оглавление: [README.md](./README.md).
