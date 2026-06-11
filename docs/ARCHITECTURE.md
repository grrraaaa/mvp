# Архитектура — SBBOL Demo

> Полная **карта фич и диаграммы**: [FEATURE_MAP.md](./FEATURE_MAP.md)

## 1. Обзор

**Next.js 15** + **FastAPI** на одном домене (Vercel) или раздельно локально.

| Слой | Назначение |
|------|------------|
| **UI** | `SbbolShell`, страницы, плавающий AI-чат |
| **3D** | Карта планет + GLB-консультант Александр / Александра |
| **AI** | OpenRouter / rule-based, SBBOL-only |
| **TTS** | Qwen (Alibaba) → Edge TTS fallback → браузер |
| **OCR** | ImageToText для фото платёжек |

```mermaid
C4Context
    title SBBOL Demo — контекст системы

    Person(user, "Пользователь", "Юрлицо в демо СберБизнес")
    System(demo, "SBBOL Demo", "Next.js + FastAPI MVP")
    System_Ext(sbbol, "sbbol.bps-sberbank.by", "Референс UI")
    System_Ext(or, "OpenRouter", "LLM")
    System_Ext(qwen, "Qwen TTS", "Alibaba Model Studio")
    System_Ext(ocr, "ImageToText", "OCR")

    Rel(user, demo, "HTTPS")
    Rel(demo, or, "chat completion")
    Rel(demo, qwen, "TTS API")
    Rel(demo, ocr, "OCR API")
    Rel(demo, sbbol, "visual reference")
```

---

## 2. Контейнеры (Vercel)

```mermaid
flowchart TB
    subgraph VERCEL["Единый домен Vercel"]
        FE["Next.js 15<br/>frontend/"]
        PY["Python serverless<br/>api/index.py → main.py"]
    end

    FE -->|rewrite /api/*| PY
    PY --> DB[(Postgres)]
    PY --> OR[OpenRouter]
    PY --> QW[Qwen TTS]
```

| Часть | Путь |
|-------|------|
| Frontend build | `frontend/` |
| Python API | `api/index.py` → `backend/main.py` |
| Rewrites | `/api/*` → serverless |

См. [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md).

---

## 3. Frontend — основные потоки

```mermaid
flowchart LR
    subgraph Pages
        P1["/"]
        P2["/payments/*"]
        P3["/statement/*"]
    end

    subgraph Assistant
        FAB[FloatingChat]
        AP[AssistantPanel]
        CHAR[3D Character]
    end

    subgraph Map3D
        SL[PlanetNavSlider]
        PO[PlanetMapOverlay]
    end

    SHELL[SbbolShell] --> Pages & SL
    FAB --> AP --> CHAR
    SL --> PO
```

Ключевые файлы: [MODULES.md](./MODULES.md) · [FILE_STRUCTURE.md](./FILE_STRUCTURE.md).

---

## 4. Backend — маршруты

```mermaid
flowchart TD
    MAIN[main.py FastAPI]
    MAIN --> CHAT["/api/chat/guest"]
    MAIN --> TTS["/api/tts/*"]
    MAIN --> FORMS["/api/forms/ocr-fill"]
    MAIN --> NAV["/api/navigation/*"]
    MAIN --> PROD["/api/products"]
    MAIN --> AUTH["/api/auth/*"]
    MAIN --> HEALTH["/api/health"]

    CHAT --> ASST[AssistantService]
    ASST --> DEMO[demo_routes]
    ASST --> LLM[OpenAI SDK]
    ASST --> RULES[rule-based]
```

Полная спецификация: [API.md](./API.md).

---

## 5. Поток чата (sequence)

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant FE as Frontend
    participant BE as FastAPI
    participant QW as Qwen TTS

    U->>FE: текст / голос / фото
    FE->>BE: POST /api/chat/guest
    Note over BE: nav → forms → LLM → rules
    BE-->>FE: message + navigation_path + form_actions
    FE->>FE: router.push + lipSync
    FE->>BE: POST /api/tts/speak
    BE->>QW: ru-RU MP3
    QW-->>BE: audio
    BE-->>FE: audio
    FE-->>U: озвучка + анимация
```

Детали AI: [ASSISTANT.md](./ASSISTANT.md) · TTS: [TTS.md](./TTS.md).

---

## 6. 3D-подсистемы

| Подсистема | Компоненты | Документ |
|------------|------------|----------|
| Карта планет | `SberSolarSystem`, `PlanetLink` | [UI_AND_3D.md](./UI_AND_3D.md) |
| Консультант | `CharacterRoomScene`, `GlbCharacter3D` | [CHARACTER_3D.md](./CHARACTER_3D.md) |

Портретная камера: Z ≈ **7.8**, Y offset **-0.30**.

---

## 7. База данных

- **Локально:** Docker Postgres (`DATABASE_URL`, см. `docker compose`)
- **Vercel:** `POSTGRES_URL` (Storage → Connect to project)

---

## 8. Безопасность

- `SITE_ACCESS_*` — Basic Auth (Next.js middleware + FastAPI)
- Секреты только в `.env` / Vercel Environment

---

## См. также

- [FEATURE_MAP.md](./FEATURE_MAP.md) — mindmap, матрица фич, все pipeline
- [TECH_STACK.md](./TECH_STACK.md) — версии пакетов
