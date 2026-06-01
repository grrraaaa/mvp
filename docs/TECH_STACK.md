<<<<<<< HEAD
# Стек технологий — фактическая реализация

## Принцип

Минимальный стек для демо: один фронт, один бэк, SQLite, опциональный LLM через OpenRouter (OpenAI-совместимый API).
=======
# 🛠️ Стек технологий — SberAI Assistant

## Выбор принципа: «Максимальная простота для MVP»

> Каждая технология выбрана по критериям:
> - Минимальная настройка
> - Большое комьюнити и документация
> - Быстрый старт без сложной инфраструктуры
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42

---

## Frontend

<<<<<<< HEAD
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

1. **Космос** — `components/three/Scene.tsx`, планеты разделов
2. **Портрет консультанта** — `personage.glb` + `GlbCharacter3D`, режим «говорящая голова», fallback `Humanoid3D`

См. [CHARACTER_3D.md](./CHARACTER_3D.md).

### Не используется в коде MVP

- Framer Motion (в package.json, в UI не подключён)
- @react-three/postprocessing
=======
| Технология | Версия | Роль | Почему |
|-----------|--------|------|--------|
| **Next.js** | 14 (App Router) | Основной UI-фреймворк | SSR из коробки, файловый роутинг, API routes как fallback |
| **React** | 18 | UI-библиотека | Входит в Next.js, компонентная модель |
| **TypeScript** | 5.x | Типизация | Надёжность, автодополнение |
| **Tailwind CSS** | 3.x | Стили | Утилитарный CSS, быстрая разработка без писанины |
| **Three.js** | r165 | 3D-движок | Самый распространённый WebGL-фреймворк |
| **@react-three/fiber** | 8.x | React-обёртка над Three.js | Декларативная 3D-разработка в JSX |
| **@react-three/drei** | 9.x | Helpers для R3F | Готовые компоненты (камера, controls, анимации) |
| **Zustand** | 4.x | State management | Проще Redux, нет boilerplate |
| **Framer Motion** | 11.x | UI-анимации | Плавные переходы компонентов |

### Почему НЕ выбраны альтернативы

| Отклонено | Причина |
|-----------|---------|
| Vue / Angular | React — стандарт для подобных проектов |
| Redux Toolkit | Избыточен для MVP, Zustand проще |
| CSS-in-JS (styled-components) | Tailwind быстрее для прототипирования |
| Babylon.js | Тяжелее Three.js, меньше примеров с React |
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42

---

## Backend

<<<<<<< HEAD
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
=======
| Технология | Версия | Роль | Почему |
|-----------|--------|------|--------|
| **Python** | 3.11+ | Язык | Лучшие AI/ML библиотеки |
| **FastAPI** | 0.110 | Web-фреймворк | Автодокументация, async, Pydantic из коробки |
| **Pydantic** | 2.x | Валидация данных | Входит в FastAPI, строгая типизация |
| **SQLAlchemy** | 2.x | ORM | Стандарт для Python, поддержка SQLite и PostgreSQL |
| **Alembic** | 1.x | Миграции БД | Официальный инструмент для SQLAlchemy |
| **python-jose** | 3.x | JWT токены | Простая JWT реализация |
| **httpx** | 0.27 | HTTP-клиент | Async-клиент для вызова OpenAI |
| **uvicorn** | 0.29 | ASGI-сервер | Быстрый сервер для FastAPI |

### Почему НЕ выбраны альтернативы

| Отклонено | Причина |
|-----------|---------|
| Django | Избыточен, медленнее для API |
| Flask | Нет встроенного async, нет авто-схемы |
| Node.js/Express | Хуже AI-экосистема, чем Python |
| GraphQL | Избыточно для MVP REST API |

---

## AI / LLM

| Технология | Роль | Почему |
|-----------|------|--------|
| **OpenAI GPT-4o** | Основная LLM | Лучшее качество, Function Calling |
| **OpenAI Function Calling** | Структурированные ответы | Надёжное извлечение intent и параметров |
| **openai Python SDK** | Клиент | Официальный, простая интеграция |

### Function Calling схема

```python
tools = [
    {
        "name": "find_bank_products",
        "description": "Найти банковские продукты по параметрам пользователя",
        "parameters": {
            "type": "object",
            "properties": {
                "product_type": {
                    "type": "string",
                    "enum": ["credit", "deposit", "investment", "payment"]
                },
                "max_rate": {"type": "number"},
                "amount": {"type": "number"},
                "term_months": {"type": "integer"}
            }
        }
    },
    {
        "name": "get_navigation_path",
        "description": "Получить путь навигации к разделу приложения",
        "parameters": {
            "type": "object",
            "properties": {
                "section": {
                    "type": "string",
                    "enum": ["loans", "deposits", "payments", "investments", "profile"]
                }
            },
            "required": ["section"]
        }
    }
]
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
```

---

<<<<<<< HEAD
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
=======
## База данных

| Этап | Технология | Причина |
|------|-----------|---------|
| **MVP** | SQLite | Нет сервера, файл в репозитории, нулевая настройка |
| **Production** | PostgreSQL | Надёжность, масштабируемость |

### Схема таблиц

```sql
-- Пользователи
CREATE TABLE users (
    id          TEXT PRIMARY KEY,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,  -- bcrypt hash
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Сессии диалога
CREATE TABLE chat_sessions (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Сообщения
CREATE TABLE messages (
    id          TEXT PRIMARY KEY,
    session_id  TEXT REFERENCES chat_sessions(id),
    role        TEXT CHECK(role IN ('user', 'assistant')),
    content     TEXT NOT NULL,
    metadata    TEXT,  -- JSON: navigation_path, products, etc.
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Банковские продукты (seed data)
CREATE TABLE products (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    type        TEXT CHECK(type IN ('credit', 'deposit', 'investment')),
    rate        REAL,
    description TEXT,
    url         TEXT,
    is_active   BOOLEAN DEFAULT TRUE
);
```

---

## Инфраструктура и деплой

| Технология | Роль | Почему |
|-----------|------|--------|
| **Docker** | Контейнеризация | Одинаковое окружение везде |
| **Docker Compose** | Оркестрация (dev) | Запуск frontend + backend одной командой |
| **Vercel** | Деплой Frontend | Бесплатно для Next.js, CI/CD из коробки |
| **Railway** | Деплой Backend | Простой деплой Python, бесплатный tier |

---

## Разработка

| Технология | Роль |
|-----------|------|
| **ESLint + Prettier** | Линтинг и форматирование JS/TS |
| **Ruff** | Быстрый Python-линтер |
| **Pytest** | Тесты для Python |
| **Vitest** | Тесты для Frontend |
| **Git Hooks (husky)** | Pre-commit проверки |

---

## Итоговая диаграмма стека

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                │
│  Next.js 14  │  TypeScript  │  Tailwind  │  Zustand            │
│  Three.js + React Three Fiber + Drei                            │
│  Framer Motion                                                  │
└─────────────────────────┬───────────────────────────────────────┘
                          │  REST API (JSON)
┌─────────────────────────▼───────────────────────────────────────┐
│                         BACKEND                                 │
│  Python 3.11  │  FastAPI  │  Pydantic  │  SQLAlchemy            │
│  JWT Auth  │  Uvicorn                                           │
└───────────────┬────────────────────────┬────────────────────────┘
                │                        │
┌───────────────▼──────────┐  ┌──────────▼───────────────────────┐
│      AI LAYER            │  │         DATABASE                 │
│  OpenAI GPT-4o           │  │  SQLite (MVP)                    │
│  Function Calling        │  │  PostgreSQL (Production)         │
│  System Prompts          │  │                                  │
└──────────────────────────┘  └──────────────────────────────────┘
```
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
