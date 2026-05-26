# 🏦 SberAI Assistant — 3D Banking Navigator

> **MVP** · AI-ассистент для банковского приложения с 3D-визуализацией интерфейса

[![Status](https://img.shields.io/badge/status-MVP-blue)]()
[![Stack](https://img.shields.io/badge/stack-Next.js%20%7C%20FastAPI%20%7C%20Three.js-green)]()
[![License](https://img.shields.io/badge/license-MIT-yellow)]()

---

## 📌 О проекте

**SberAI Assistant** — виртуальный помощник внутри банковского приложения.  
Он понимает вопросы пользователя на естественном языке, находит нужные банковские продукты и **визуально ведёт** пользователя через интерфейс приложения в 3D-пространстве.

### Пример сценария

```
Пользователь: «Где взять кредит под 5%?»

Ассистент:
  1. Анализирует запрос через LLM
  2. Находит подходящие продукты в каталоге
  3. Показывает путь внутри приложения (breadcrumb + 3D-анимация)
  4. Отображает кнопки-ссылки на нужные разделы
  5. Сопровождает пользователя к форме оформления
```

---

## ✨ Возможности MVP

- 💬 Чат с AI-ассистентом (OpenAI GPT-4o)
- 🗺️ Навигационные подсказки по разделам приложения
- 🔍 Поиск банковских предложений по параметрам
- 🔗 Быстрые ссылки и кнопки переходов
- 🧊 3D-визуализация маршрута через интерфейс (Three.js)
- 🔐 JWT-аутентификация
- 📊 Логирование запросов и аналитика

---

## 🗂️ Структура проекта

```
sber/
├── frontend/               # Next.js приложение
│   ├── app/                # App Router (страницы)
│   ├── components/         # UI-компоненты
│   │   ├── assistant/      # Чат-интерфейс ассистента
│   │   ├── navigation/     # Навигационные подсказки
│   │   └── three/          # 3D-компоненты (Three.js / R3F)
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Утилиты, API-клиент
│   └── store/              # Zustand state management
│
├── backend/                # FastAPI сервер
│   ├── api/                # Роуты API
│   ├── services/           # Бизнес-логика
│   │   ├── ai/             # AI-модуль (OpenAI)
│   │   ├── navigation/     # Логика навигации
│   │   └── products/       # Банковские продукты
│   ├── models/             # Pydantic модели
│   └── db/                 # База данных (SQLite/PostgreSQL)
│
├── ai/                     # AI конфигурация
│   ├── prompts/            # System prompts
│   ├── tools/              # Function calling definitions
│   └── knowledge/          # База знаний (JSON)
│
├── docs/                   # Документация
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── MODULES.md
│   └── diagrams/
│
├── assets/                 # Статические ресурсы
│   ├── 3d/                 # 3D-модели (.glb, .gltf)
│   └── icons/
│
├── docker/                 # Docker конфигурация
├── .env.example
├── docker-compose.yml
└── README.md
```

---

## 🚀 Быстрый старт

### Требования

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose
- OpenAI API ключ

### Запуск через Docker (рекомендуется)

```bash
# 1. Клонировать репозиторий
git clone https://github.com/your-org/sber-ai-assistant.git
cd sber-ai-assistant

# 2. Настроить переменные окружения
cp .env.example .env
# Заполнить OPENAI_API_KEY и другие переменные

# 3. Запустить все сервисы
docker-compose up --build
```

Приложение будет доступно на `http://localhost:3000`

### Ручной запуск

```bash
# Frontend
cd frontend
npm install
npm run dev          # http://localhost:3000

# Backend (отдельный терминал)
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000   # http://localhost:8000

# API документация: http://localhost:8000/docs
```

---

## 🛠️ Стек технологий

| Слой | Технология | Назначение |
|------|-----------|------------|
| Frontend | Next.js 14 (App Router) | UI, SSR |
| 3D | Three.js + React Three Fiber | 3D-визуализация |
| State | Zustand | Управление состоянием |
| Backend | FastAPI (Python) | REST API |
| AI | OpenAI GPT-4o + Function Calling | Обработка запросов |
| Database | SQLite → PostgreSQL | Хранение данных |
| Auth | JWT (jose) | Аутентификация |
| Deploy | Docker + Vercel/Railway | Деплой |

---

## 🏗️ Архитектура

Подробная документация: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

```
User ──► Frontend (Next.js + Three.js)
              │
              ▼
         Backend API (FastAPI)
              │
       ┌──────┴──────┐
       ▼             ▼
   AI Module    Navigation Module
  (OpenAI)      (App Map JSON)
       │             │
       └──────┬──────┘
              ▼
         Response: {
           message,
           navigation_path,
           products,
           action_buttons
         }
```

---

## 📍 Roadmap

### v0.1 — MVP (текущий)
- [x] Архитектура проекта
- [ ] Базовый чат-интерфейс
- [ ] Интеграция OpenAI
- [ ] Навигационные подсказки
- [ ] 3D-сцена (базовая)

### v0.2 — Enhanced
- [ ] Полноценная 3D-навигация
- [ ] Персонализированные рекомендации
- [ ] История диалогов
- [ ] PostgreSQL миграция

### v0.3 — Production
- [ ] Мультиязычность
- [ ] Голосовой ввод
- [ ] A/B тестирование
- [ ] Мониторинг (Grafana)

---

## 📄 Лицензия

MIT © 2026 SberAI Team
