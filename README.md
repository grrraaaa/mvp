# SBBOL Demo · AI-консультант (MVP)

Демо интернет-банка [sbbol.bps-sberbank.by](https://sbbol.bps-sberbank.by) с AI-чатом, 3D-картой разделов, заполнением платёжных форм (текст / голос / фото OCR) и ссылками на [sber-bank.by](https://www.sber-bank.by).

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
| **3D** | Карта разделов + консультант (GLB) |

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

| Файл | Содержание |
|------|------------|
| [LOCAL_DEV.md](docs/LOCAL_DEV.md) | Локальный запуск, проверка чата |
| [VERCEL_DEPLOY.md](docs/VERCEL_DEPLOY.md) | Vercel, env, Postgres |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Архитектура |
| [TECH_STACK.md](docs/TECH_STACK.md) | Стек |

---

## Лицензия

MIT · демо-проект
