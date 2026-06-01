# Стек технологий — фактическая реализация

## Принцип

Минимальный стек для демо: один фронт, один бэк, SQLite, опциональный LLM через OpenRouter (OpenAI-совместимый API).

---

## Frontend

| Технология | Версия (package.json) | Использование |
|-----------|------------------------|---------------|
| **Next.js** | 15.x | App Router, `app/page.tsx`, dynamic import 3D |
| **React** | 19.x | UI |
| **TypeScript** | 5.4 | Типизация |
| **Tailwind CSS** | 3.4 | Стили, тема Сбера (`sber-*`) |
| **Three.js** | 0.165 | WebGL |
| **@react-three/fiber** | 9.x | Декларативный 3D |
| **@react-three/drei** | 10.x | Stars, Grid, Html, OrbitControls, Text |
| **Zustand** | 4.5 | `assistantStore`, `characterStore`, `characterBehaviorStore` |
| **Axios** | 1.7 | API-клиент (заготовка) |

### UI / дизайн

- Палитра: `#21A038` (зелёный Сбера), `#FFCD00` (акцент), тёмный фон `#041810`
- CSS-переменные: `app/globals.css`
- Константы для 3D: `lib/sber/theme.ts`

### 3D — две сцены

1. **Космос** — `components/three/SolarSystemScene.tsx`, планеты разделов
2. **Портрет консультанта** — `personage.glb` + `GlbCharacter3D`, режим «говорящая голова», fallback `Humanoid3D`

См. [CHARACTER_3D.md](./CHARACTER_3D.md).

### Не используется в коде MVP

- Framer Motion (в package.json, в UI не подключён)
- @react-three/postprocessing

---

## Backend

| Технология | Версия | Использование |
|-----------|--------|---------------|
| **Python** | 3.11+ | Runtime |
| **FastAPI** | 0.115+ | REST API, CORS, lifespan |
| **Uvicorn** | 0.30+ | ASGI |
| **Pydantic** | 2.x | Схемы запросов/ответов |
| **pydantic-settings** | 2.x | `.env` из `mvp/.env` |
| **SQLAlchemy** | 2.x | Async ORM |
| **aiosqlite** | 0.20+ | SQLite async |
| **openai** SDK | 1.50+ | OpenAI + OpenRouter |
| **python-jose** | 3.x | JWT (auth заготовка) |

### AI

| Режим | Условие | Поведение |
|-------|---------|-----------|
| **OpenRouter/OpenAI** | `OPENAI_API_KEY` задан | GPT + function calling |
| **Rule-based** | Нет ключа или ошибка API | Regex intent + `sber_links` |

Конфиг: `OPENAI_BASE_URL`, `OPENAI_MODEL`, `OPENROUTER_*`.

---

## Данные

| Компонент | Технология |
|-----------|------------|
| БД | SQLite (`sqlite+aiosqlite:///./data/sber.db`) |
| Seed | `db/seed.py` — продукты с URL sberbank.ru |
| Карта навигации | `ai/knowledge/app_map.json` (статический JSON) |

Alembic в requirements **не подключён** — таблицы через `create_all` в `init_db`.

---

## Инфраструктура

| Инструмент | Статус |
|------------|--------|
| Docker Compose | `docker-compose.yml` — frontend + backend |
| Vercel / Railway | Описано как опция, не настроено в репо |

---

## Схема зависимостей

```
┌─────────────────────────────────────────────────────────┐
│ Next.js 15 · React 19 · Tailwind · Zustand              │
│  ├─ R3F: карта планет (разделы услуг)                  │
│  └─ R3F: Humanoid3D + lipSync + character settings      │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTP JSON
┌───────────────────────────▼─────────────────────────────┐
│ FastAPI · Pydantic · SQLAlchemy · aiosqlite              │
│  ├─ assistant.py (LLM | rules)                          │
│  └─ sber_links.py → https://www.sberbank.ru/...         │
└───────────────────────────┬─────────────────────────────┘
                            │
              ┌─────────────┴─────────────┐
              ▼                           ▼
        OpenRouter API              SQLite + app_map.json
```

---

## Переменные окружения

| Переменная | Назначение |
|------------|------------|
| `OPENAI_API_KEY` | Ключ OpenRouter/OpenAI |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENAI_MODEL` | Например `openai/gpt-4o-mini` |
| `DATABASE_URL` | SQLite async URL |
| `NEXT_PUBLIC_API_URL` | URL бэкенда для фронта |
| `NEXT_PUBLIC_CHARACTER_PRESET` | `banker-m`, `banker-f`, … |

См. `mvp/.env.example`.
