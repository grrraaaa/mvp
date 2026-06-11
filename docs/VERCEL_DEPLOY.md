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
| `QWEN_TTS_API_KEY` | Озвучка ответов + выбор голоса |
| `QWEN_TTS_BASE_URL` | `https://dashscope-intl.aliyuncs.com/api/v1` |
| `QWEN_TTS_MODEL` | `qwen3-tts-flash,cosyvoice-v3-flash` |
| `QWEN_TTS_VOICE` | `qwen-male` (или `qwen-female`) |
| `POSTGRES_URL` | из Storage (не вручную) |
| `RESEED_ON_DEPLOY` | `1` — на каждом cold start снести схему и засеять заново (только dev). На проде `0`/пусто, иначе снесёт реальные правки пользователей |

После изменений — **Redeploy**.

---

## 5. Проверка после деплоя

1. Сайт открывается (при необходимости — Basic Auth).
2. `GET /api/health` → `{"status":"ok",...}`.
3. Чат: «выписка по счёту» → навигация на `/statement`, без *HTTP 500*.
4. Формы: `/payments/paydocbyn`, фото → OCR (если ключи заданы).
5. TTS: `GET /api/tts/status` → `qwen_available: true`; в чате — выбор голоса и озвучка ответа.

---

## 5.1. Сброс БД при деплое (только dev-окружение)

Чтобы при каждом деплое на Vercel **схема сносилась и пересоздавалась** с актуальными seed-данными (например, после правок в `backend/db/seed_*.py`), добавьте переменную окружения:

| Ключ | Значение |
|------|----------|
| `RESEED_ON_DEPLOY` | `1` |

Что произойдёт на следующем деплое:

1. На первом запросе к `/api/*` (cold start) Vercel поднимет serverless-функцию.
2. `api/index.py` увидит `RESEED_ON_DEPLOY=1` → выполнит `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public` + `create_all` + все `seed_*`.
3. После этого БД будет «свежей» — все seed-документы, контрагенты, отчёты INFO: на месте.

⚠️ **Важно:**

- **На проде НЕ включать** — снесёт все реальные правки пользователей (платежи, документы, чат-сессии).
- В Vercel env variables имеет смысл включать `RESEED_ON_DEPLOY=1` **только в Preview-окружении** (например, для ветки `main`, если это dev-deploy). Для Production — оставить пустым или `0`.
- После `RESEED_ON_DEPLOY=1` первый запрос к сайту может быть **долгим** (3–10 сек) — это полный reseed. Дальше — мгновенно.
- Проверка: после деплоя откройте `/api/health` → `"db": "postgres"`. Затем `GET /api/banking/documents?doc_prefix=INFO:` → должны быть записи.

Ручной reseed без деплоя:

```bash
curl -X POST https://mvp-beta-umber.vercel.app/api/admin/reseed \
  -H "X-Admin-Token: <ADMIN_TOKEN>"  # если задан в env
```

Без `ADMIN_TOKEN` эндпоинт открыт (только для demo).

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
