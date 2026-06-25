# SBBOL Demo · AI-консультант (MVP)

Демо интернет-банка [sbbol.bps-sberbank.by](https://sbbol.bps-sberbank.by) с AI-чатом, 3D-консультантом, заполнением платёжных форм (текст / голос / фото OCR) и ссылками на [sber-bank.by](https://www.sber-bank.by).

> Учебный проект, не является официальным продуктом банка.

**Прод (Vercel):** https://mvp-beta-umber.vercel.app

---

## Возможности

| Модуль | Описание |
|--------|----------|
| **Страницы SBBOL** | `/payments`, `/statement`, `/salary`, формы PAYDOCBY и др. |
| **Чат** | OpenRouter/OpenAI + rule-based fallback |
| **Навигация** | «выписка по счёту» → `/statement` и др. |
| **Формы** | AI-заполнение полей на страницах платежей |
| **OCR** | ImageToText.com — фото → поля формы |
| **3D** | Консультант Александр/Александра (GLB, 3 модели) |
| **TTS** | Qwen (Alibaba) + Edge TTS fallback, выбор голоса |

---

## Быстрый старт (локально)

```powershell
cd mvp
copy .env.example .env
# Заполните OPENAI_API_KEY в .env

# API
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Сайт (другой терминал)
cd frontend
npm install
npm run dev
```

- Сайт: http://localhost:3000  
- API: http://127.0.0.1:8000/docs  
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`

Подробно: **[docs/LOCAL_DEV.md](docs/LOCAL_DEV.md)** (запуск и проверка ИИ).

---

## Деплой Vercel

Фронт и бэк — **один проект**, деплой из корня репозитория `mvp`:

```powershell
cd mvp
vercel --prod
```

Инструкция: **[docs/VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md)**

---

## Структура

```
mvp/
├── frontend/       # Next.js 15
├── backend/        # FastAPI
├── api/index.py    # Vercel Python entry
├── vercel.json
├── package.json    # next (для детекции Vercel)
└── docs/
```

---

## Документация

**Карта фич (Mermaid):** **[docs/FEATURE_MAP.md](docs/FEATURE_MAP.md)**  
Оглавление (13 документов): **[docs/README.md](docs/README.md)**

| Файл | Содержание |
|------|------------|
| **[FEATURE_MAP.md](docs/FEATURE_MAP.md)** | **Mindmap, pipeline, матрица фич** |
| [LOCAL_DEV.md](docs/LOCAL_DEV.md) | Локальный запуск |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура + C4 |
| [ASSISTANT.md](docs/ASSISTANT.md) | AI-консультант SBBOL |
| [TTS.md](docs/TTS.md) | Qwen TTS, голоса |
| [CHARACTER_3D.md](docs/CHARACTER_3D.md) | 3D Александр/Александра |
| [UI.md](docs/UI.md) | UI и адаптив |
| [API.md](docs/API.md) | REST API |
| [VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) | Деплой |

---

## Лицензия

MIT · демо-проект
