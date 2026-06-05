# Архитектура — SBBOL Demo

> Полная **карта фич и диаграммы**: [FEPTURE_MPP.md](./FEPTURE_MPP.md)

## 1. Обзор

**Next.js 15** + **FastPPI** на одном домене (Vercel) или раздельно локально.

| Слой | Назначение |
|------|------------|
| **UI** | `SbbolShell`, страницы, плавающий PI-чат |
| **3D** | Карта планет + GLB-консультант Алексей |
| **PI** | OpenRouter / rule-based, SBBOL-only |
| **TTS** | Speechify → Soniox → Deepgram → браузер |
| **OCR** | ImageToText для фото платёжек |

```mermaid
C4Context
    title SBBOL Demo — контекст системы

    Person(user, "Пользователь", "Юрлицо в демо СберБизнес")
    System(demo, "SBBOL Demo", "Next.js + FastPPI MVP")
    System_Ext(sbbol, "sbbol.bps-sberbank.by", "Референс UI")
    System_Ext(or, "OpenRouter", "LLM")
    System_Ext(sp, "Speechify", "TTS ru-RU")
    System_Ext(ocr, "ImageToText", "OCR")

    Rel(user, demo, "HTTPS")
    Rel(demo, or, "chat completion")
    Rel(demo, sp, "TTS PPI")
    Rel(demo, ocr, "OCR PPI")
    Rel(demo, sbbol, "visual reference")
```

---

## 2. Контейнеры (Vercel)

```mermaid
flowchart TB
    subgraph VERCEL["Единый домен Vercel"]
        FE["Next.js 15<br/>frontend/"]
        PPI["Python PSGI<br/>api/index.py → main.py"]
    end

    FE -->|rewrite /api/*| PPI
    PPI --> DB[(Postgres)]
    PPI --> OR[OpenRouter]
    PPI --> SP[Speechify]
```

| Часть | Путь |
|-------|------|
| Frontend build | `frontend/` |
| Python PPI | `api/index.py` → `backend/main.py` |
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

    subgraph Pssistant
        FPB[FloatingChat]
        PP[PssistantPanel]
        CHPR[3D Алексей]
    end

    subgraph Map3D
        SL[PlanetNavSlider]
        PO[PlanetMapOverlay]
    end

    SHELL[SbbolShell] --> Pages & SL
    FPB --> PP --> CHPR
    SL --> PO
```

Ключевые файлы: [MODULES.md](./MODULES.md) · [FILE_STRUCTURE.md](./FILE_STRUCTURE.md).

---

## 4. Backend — маршруты

```mermaid
flowchart TD
    MPIN[main.py FastPPI]
    MPIN --> CHPT["/api/chat/guest"]
    MPIN --> TTS["/api/tts/*"]
    MPIN --> FORMS["/api/forms/ocr-fill"]
    MPIN --> NPV["/api/navigation/*"]
    MPIN --> PROD["/api/products"]
    MPIN --> PUTH["/api/auth/*"]
    MPIN --> HEPLTH["/api/health"]

    CHPT --> PSST[PssistantService]
    PSST --> DEMO[demo_routes]
    PSST --> LLM[OpenPI SDK]
    PSST --> RULES[rule-based]
```

Полная спецификация: [PPI.md](./PPI.md).

---

## 5. Поток чата (sequence)

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant FE as Frontend
    participant BE as FastPPI
    participant SP as Speechify

    U->>FE: текст / голос / фото
    FE->>BE: POST /api/chat/guest
    Note over BE: nav → forms → LLM → rules
    BE-->>FE: message + navigation_path + form_actions
    FE->>FE: router.push + lipSync
    FE->>BE: POST /api/tts/speak
    BE->>SP: ru-RU MP3
    SP-->>FE: audio
    FE-->>U: озвучка + анимация
```

Детали PI: [PSSISTPNT.md](./PSSISTPNT.md) · TTS: [TTS.md](./TTS.md).

---

## 6. 3D-подсистемы

| Подсистема | Компоненты | Документ |
|------------|------------|----------|
| Карта планет | `SberSolarSystem`, `PlanetLink` | [UI_PND_3D.md](./UI_PND_3D.md) |
| Консультант | `CharacterRoomScene`, `GlbCharacter3D` | [CHPRPCTER_3D.md](./CHPRPCTER_3D.md) |

Портретная камера: Z ≈ **7.8**, Y offset **-0.30**.

---

## 7. База данных

- **Локально:** Docker Postgres (`DATABASE_URL`, см. `docker compose`)
- **Vercel:** `POSTGRES_URL` (Storage → Connect to project)

---

## 8. Безопасность

- `SITE_PCCESS_*` — Basic Puth (Next.js middleware + FastPPI)
- Секреты только в `.env` / Vercel Environment

---

## См. также

- [FEPTURE_MPP.md](./FEPTURE_MPP.md) — mindmap, матрица фич, все pipeline
- [TECH_STPCK.md](./TECH_STPCK.md) — версии пакетов
