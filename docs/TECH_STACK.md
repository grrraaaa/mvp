# Стек технологий

Фактическая реализация MVP. Карта фич: [FEATURE_MAP.md](./FEATURE_MAP.md).

---

## Frontend

| Технология | Версия | Использование |
|-----------|--------|---------------|
| **Next.js** | 15.x | App Router, middleware, dynamic 3D |
| **React** | 19.x | UI |
| **TypeScript** | 5.4 | Типизация |
| **Tailwind CSS** | 3.4 | Стили, `sbbol-*`, `sber-*` |
| **Three.js** | 0.165 | WebGL |
| **@react-three/fiber** | 9.x | 3D в React |
| **@react-three/drei** | 10.x | OrbitControls, Stars, Text, … |
| **Zustand** | 4.5 | `assistantStore`, `characterStore`, `ttsStore`, … |

### UI

- Токены СББОЛ: `app/globals.css` (`--sbbol-*`)
- 3D-тема: `lib/sber/theme.ts`
- Иконки: `components/sbbol/SbbolIcons.tsx`

### 3D (две сцены)

1. **Карта** — `SolarSystemScene`, `planetMap.ts`
2. **Консультант** — `personage.glb`, `GlbCharacter3D`, vertex lip sync

### Не используется в UI

- Framer Motion (в package.json, не подключён в компонентах)

---

## Backend

| Технология | Версия | Использование |
|-----------|--------|---------------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.115+ | REST, CORS, lifespan |
| **Uvicorn** | 0.30+ | ASGI |
| **Pydantic** | 2.x | Схемы |
| **pydantic-settings** | 2.x | `mvp/.env` |
| **SQLAlchemy** | 2.x | Async ORM |
| **httpx** | 0.27+ | Speechify, Soniox, OCR |
| **openai** SDK | 1.50+ | OpenRouter / OpenAI |

### AI

| Режим | Условие |
|-------|---------|
| OpenRouter/OpenAI | `OPENAI_API_KEY` |
| Rule-based | Нет ключа / ошибка API |

### TTS

| Провайдер | Модуль |
|-----------|--------|
| Speechify | `services/tts/speechify.py` |
| Soniox | `services/tts/soniox.py` |
| Deepgram | `services/tts/deepgram.py` |

Приоритет в `services/tts/__init__.py`.

---

## Данные

| Компонент | Путь |
|-----------|------|
| БД | Postgres (`core/db_url.py`) |
| Seed | `db/seed.py` |
| Карта знаний | `ai/knowledge/app_map.json` |

Миграции Alembic **не используются** — `create_all` в `init_db`.

---

## Инфраструктура

| Инструмент | Файл |
|------------|------|
| Docker Compose | `docker-compose.yml` |
| Vercel | `vercel.json`, `api/index.py` |

---

## Переменные окружения (сводка)

| Переменная | Назначение |
|------------|------------|
| `OPENAI_API_KEY` | LLM |
| `OPENAI_BASE_URL` | OpenRouter URL |
| `SPEECHIFY_API_KEY` | TTS (приоритет) |
| `SPEECHIFY_TTS_VOICE` | Голос по умолчанию |
| `SONIOX_API_KEY` | TTS запасной |
| `IMAGETOTEXT_*` | OCR |
| `DATABASE_URL` / `POSTGRES_URL` | БД |
| `NEXT_PUBLIC_API_URL` | URL API для фронта |
| `NEXT_PUBLIC_CHARACTER_*` | GLB, портрет, камера |
| `SITE_ACCESS_*` | Basic Auth |

Полный список: [../.env.example](../.env.example).

---

## Схема

```
Next.js · React · Tailwind · Zustand
 ├─ R3F: планеты (внутренние маршруты SBBOL)
 ├─ R3F: GLB-консультант + vertex lip sync
 └─ TTS UI + Web Speech input
        │ HTTP
FastAPI · httpx · SQLAlchemy
 ├─ assistant.py (LLM | rules | SBBOL links)
 └─ tts/ (Speechify | Soniox | Deepgram)
        │
 OpenRouter · Speechify API · Postgres
```
