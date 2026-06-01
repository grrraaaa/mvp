# Локальная разработка и проверка ИИ

## Требования

- Node.js 20+
- Python 3.11+
- Ключ [OpenRouter](https://openrouter.ai/keys) или OpenAI (для LLM; без ключа — только rule-based ответы)

## Настройка один раз

```powershell
cd C:\Users\New\Desktop\sber\mvp
copy .env.example .env
```

В `mvp/.env` задайте минимум:

```env
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
```

В `mvp/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Опционально Postgres:

```powershell
docker compose up -d postgres
```

В `.env`: `DATABASE_URL=postgresql+asyncpg://sber:sber@127.0.0.1:5432/sber`

Без `DATABASE_URL` — SQLite в `backend/data/sber.db`.

## Запуск

**Терминал 1 — бэкенд:**

```powershell
cd C:\Users\New\Desktop\sber\mvp\backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

**Терминал 2 — фронт:**

```powershell
cd C:\Users\New\Desktop\sber\mvp\frontend
npm install
npm run dev
```

Откройте http://localhost:3000

## Проверка ИИ (CLI)

```powershell
# Health
Invoke-RestMethod http://127.0.0.1:8000/api/health

# Демо-навигация (rule-based, без LLM)
$body = '{"message":"выписка по счёту","session_id":null,"page_route":"/statement"}'
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/chat/guest -Method POST -ContentType "application/json; charset=utf-8" -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

Ожидание: `navigation_path` с `/statement`, `message` на русском.

Для LLM в ответе `/api/health` поле `ai_mode` должно быть `openrouter` или `openai`, не `rule-based`.

## Проверка в браузере

1. Откройте http://localhost:3000  
2. Панель ассистента (чат справа / снизу на mobile)  
3. Сообщения для проверки:
   - `выписка по счёту` → переход в раздел выписки  
   - `кредит` → продукты / ссылки sber-bank.by  
   - на `/payments/paydocbyn`: «сумма 100» → заполнение формы  

Ошибка «Не удалось связаться с сервером» — бэкенд не запущен или неверный `NEXT_PUBLIC_API_URL`.

## Отличие от Vercel

| | Локально | Vercel |
|---|----------|--------|
| API URL | `http://127.0.0.1:8000` | тот же домен `/api` |
| БД | SQLite или Docker Postgres | Postgres или `/tmp` SQLite |
| Basic Auth | только если задан `SITE_ACCESS_PASSWORD` в `.env` | рекомендуется на проде |
