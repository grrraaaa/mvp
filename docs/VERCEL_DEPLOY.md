# Деплой на Vercel (фронт + бэк на одном домене)

Репозиторий: `https://github.com/grrraaaa/mvp` — **корень репо = папка `mvp`**, не родитель `sber`.

Один проект Vercel (`grrraaaas-projects/mvp`):
- **Next.js 15** — `frontend/`
- **FastAPI** — `api/index.py` → маршруты `/api/*`
- **БД:** Vercel Postgres (обязательно для production)

Продакшен: **https://mvp-beta-umber.vercel.app**

---

## 1. Git

```powershell
cd C:\Users\New\Desktop\sber\mvp
git status
git push origin main
```

Ветка: **`main`** (не `master`).

---

## 2. Деплой из CLI

```powershell
cd C:\Users\New\Desktop\sber\mvp
vercel --prod
```

Важно:
- Команда только из **`mvp`** (там `vercel.json`, `package.json` с `next`, `frontend/`).
- В корне `mvp/package.json` должен быть `next` — иначе ошибка *No Next.js version detected*.
- `installCommand`: `npm install && cd frontend && npm install`

В Dashboard:
- **Root Directory:** пусто или `.` (не `mvp`, если репо уже = `mvp`)
- **Production Branch:** `main`
- **Framework:** Next.js

---

## 3. PostgreSQL (рекомендуется)

1. Vercel → проект **mvp** → **Storage** → **Postgres** → **Connect**
2. Появится `POSTGRES_URL` — бэкенд сам переведёт в `postgresql+asyncpg://`

Без Postgres API не сможет инициализировать БД и будет отдавать ошибки.

Проверка: `/api/health` → `"db": "postgres"`.

---

## 4. Переменные окружения (Production)

| Переменная | Значение |
|------------|----------|
| `NEXT_PUBLIC_API_URL` | **пусто** (same-origin `/api`) |
| `OPENAI_API_KEY` | ключ OpenRouter / OpenAI |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `OPENAI_MODEL` | `openai/gpt-4o-mini` |
| `SITE_ACCESS_USER` / `SITE_ACCESS_PASSWORD` | Basic Auth (рекомендуется) |
| `SECRET_KEY` | случайная строка |
| `ALLOWED_ORIGINS` | `https://mvp-beta-umber.vercel.app` |
| `IMAGETOTEXT_API_KEY` / `SECRET` | OCR на формах платежей |
| `SPEECHIFY_API_KEY` | Озвучка ответов + выбор голоса |
| `SPEECHIFY_TTS_MODEL` | `simba-multilingual` |
| `SPEECHIFY_TTS_LANGUAGE` | `ru-RU` |
| `SPEECHIFY_TTS_VOICE` | `george` (или другой id) |
| `POSTGRES_URL` | из Storage (не вручную) |

После изменений — **Redeploy**.

---

## 5. Проверка после деплоя

1. Сайт открывается (при необходимости — Basic Auth).
2. `GET /api/health` → `{"status":"ok",...}`.
3. Чат: «выписка по счёту» → навигация на `/statement`, без *HTTP 500*.
4. Формы: `/payments/paydocbyn`, фото → OCR (если ключи заданы).
5. TTS: `GET /api/tts/status` → `enabled: true`; в чате — выбор голоса и озвучка ответа.

---

## 6. Локальная разработка

См. [LOCAL_DEV.md](./LOCAL_DEV.md) — запуск backend + frontend и проверка ИИ.

Кратко:

```powershell
cd C:\Users\New\Desktop\sber\mvp
copy .env.example .env   # ключ OPENAI_API_KEY обязателен для LLM

# Терминал 1 — API
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Терминал 2 — сайт
cd frontend
npm install
npm run dev
```

- Сайт: http://localhost:3000  
- API docs: http://127.0.0.1:8000/docs  
- `frontend/.env.local`: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`

---

## 7. Типичные ошибки сборки

| Ошибка | Решение |
|--------|---------|
| `npm install` / JSON parse | В репо не должно быть `<<<<<<<` в `package.json` — см. `git grep '<<<<<<<'` |
| No Next.js version detected | Деплой из `mvp/`, в корне есть `dependencies.next` |
| Чат: HTTP 500 | Подключить Postgres или обновить бэкенд (`POSTGRES_URL` / `DATABASE_URL`) |
| Чат: HTTP 401 | Задать тот же Basic Auth, что у сайта, или открыть сайт после входа в браузере |

---

## Откат

```powershell
git log --oneline -10
git checkout <commit> -- .
```
