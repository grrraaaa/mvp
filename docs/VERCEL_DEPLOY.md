# Деплой на Vercel (фронт + бэк + PostgreSQL, только для вас)

Один проект Vercel:
- **Next.js** — сайт SBBOL
- **FastAPI** — `/api/*` (Python Serverless)
- **PostgreSQL** — Vercel Postgres (Storage), постоянные данные

Доступ закрыт **HTTP Basic Auth** на сайте и на API (один логин/пароль).

---

## 1. GitHub

```powershell
cd c:\Users\New\Desktop\sber
git add mvp
git commit -m "feat: Vercel + PostgreSQL + private access"
git push origin main
```

Репозиторий — **Private**.

---

## 2. Vercel — создать проект

1. [vercel.com](https://vercel.com) → **Add New Project** → ваш репозиторий  
2. **Root Directory:** `mvp`  
3. Deploy (первый раз может упасть без БД — нормально)

---

## 3. PostgreSQL (обязательно на Vercel)

1. В проекте Vercel → **Storage** → **Create Database** → **Postgres**  
2. Подключите к проекту (**Connect Project**)  
3. Vercel сам добавит переменные:
   - `POSTGRES_URL`
   - `POSTGRES_URL_NON_POOLING` (при необходимости миграций)

Бэкенд автоматически преобразует `postgres://` → `postgresql+asyncpg://`.

Локально с Docker:

```powershell
cd mvp
docker compose up -d postgres
# DATABASE_URL=postgresql+asyncpg://sber:sber@localhost:5432/sber
```

---

## 4. Закрыть сайт (только вы) — обязательно

| Переменная | Пример | Где |
|------------|--------|-----|
| `SITE_ACCESS_USER` | `you` | Vercel → Environment Variables |
| `SITE_ACCESS_PASSWORD` | длинный случайный пароль | то же |

Без `SITE_ACCESS_PASSWORD` сайт и API **публичные**.

- Браузер спросит логин/пароль при открытии сайта  
- Те же данные нужны для `/api/*` (браузер передаёт заголовок после входа)

Дополнительно:
- Приватный репозиторий GitHub  
- Не публикуйте ссылку `*.vercel.app`  
- (Опционально) Vercel **Deployment Protection** на платном плане  

---

## 5. Остальные переменные

| Переменная | Значение на Vercel |
|------------|-------------------|
| `NEXT_PUBLIC_API_URL` | **пусто** (тот же домен) |
| `OPENAI_API_KEY` | ваш ключ |
| `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
| `IMAGETOTEXT_API_KEY` / `SECRET` | OCR |
| `SECRET_KEY` | случайная строка |
| `ALLOWED_ORIGINS` | `https://ваш-проект.vercel.app` |

`POSTGRES_URL` — из Storage, не трогать вручную.

---

## 6. Проверка

1. `https://ваш-проект.vercel.app` → запрос логина/пароля  
2. `https://ваш-проект.vercel.app/api/health` → после авторизации: `"db": "postgres"`  
3. Чат, формы, OCR на `/payments/paydocbyn`

---

## 7. Локальная разработка

```powershell
# Postgres
cd mvp
docker compose up -d postgres

# .env в mvp/
DATABASE_URL=postgresql+asyncpg://sber:sber@127.0.0.1:5432/sber
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000

cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

cd frontend
npm run dev
```

Без Postgres локально — можно не задавать `DATABASE_URL` (будет SQLite в `./data/sber.db`).

---

## Откат

Тег/коммит до миграции: см. историю `git log` в репозитории.
