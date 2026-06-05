# Локальная разработка

## Требования

- **Node.js** 20+
- **Python** 3.11+
- Ключ [OpenRouter](https://openrouter.ai/keys) или OpenAI (для LLM; без ключа — rule-based)
- Опционально: [Speechify](https://console.speechify.ai/api-keys) для озвучки, Docker для Postgres

---

## Настройка один раз

```powershell
cd C:\Users\New\Desktop\sber\mvp
copy .env.example .env
```

### `mvp/.env` (минимум)

```env
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini

# Озвучка (Speechify, русский)
SPEECHIFY_API_KEY=...
SPEECHIFY_TTS_MODEL=simba-multilingual
SPEECHIFY_TTS_LANGUAGE=ru-RU
SPEECHIFY_TTS_VOICE=george
```

Без `SPEECHIFY_API_KEY` — озвучка через голос браузера. Запас: `SONIOX_API_KEY`, `DEEPGRAM_API_KEY`. См. [TTS.md](./TTS.md).

### `mvp/frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

### Опционально: Postgres

```powershell
docker compose up -d postgres
```

В `.env`:

```env
DATABASE_URL=postgresql+asyncpg://sber:sber@127.0.0.1:5432/sber
```

`DATABASE_URL` обязателен (только PostgreSQL).

### Опционально: камера 3D

```env
NEXT_PUBLIC_PORTRAIT_CAMERA_Z=6.9
NEXT_PUBLIC_PORTRAIT_CAMERA_Z_COMPACT=7.5
```

См. [CHARACTER_3D.md](./CHARACTER_3D.md).

---

## Запуск

**Терминал 1 — API:**

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

- Сайт: http://localhost:3000  
- Swagger: http://127.0.0.1:8000/docs  

---

## Проверка API (PowerShell)

```powershell
# Health
Invoke-RestMethod http://127.0.0.1:8000/api/health

# TTS
Invoke-RestMethod http://127.0.0.1:8000/api/tts/status
Invoke-RestMethod http://127.0.0.1:8000/api/tts/voices

# Чат (rule-based работает и без LLM)
$body = '{"message":"выписка по счёту","session_id":null,"page_route":"/statement"}'
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/chat/guest -Method POST `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body))
```

Ожидание чата: `navigation_path` = `/statement`, текст на русском.

Для LLM: в `/api/health` поле `ai_mode` ≠ `rule-based`.

---

## Проверка в браузере

1. http://localhost:3000  
2. Открыть AI-чат (кнопка справа внизу)  
3. Выбрать голос в выпадающем списке (если Speechify настроен)  
4. Сообщения:
   - `выписка по счёту` → `/statement`
   - `зарплатный проект` → `/salary`
   - на `/payments/paydocbyn`: «сумма 100» → поля формы  

**Ошибка «Не удалось связаться с сервером»** — бэкенд не запущен или неверный `NEXT_PUBLIC_API_URL`.

**3D:** персонаж должен быть на дистанции (не крупный план лица). Подкрутить: `NEXT_PUBLIC_PORTRAIT_CAMERA_Z`.

---

## Hydration mismatch (`bis_skin_checked`)

Расширения браузера (Bitdefender и др.) меняют DOM до гидратации React. Решение: инкогнито без расширений или отключить защиту для `localhost`.

`ClientRoot` в `layout.tsx` — клиентский mount без SSR-расхождений.

---

## Локально vs Vercel

| | Локально | Vercel |
|---|----------|--------|
| API | `http://127.0.0.1:8000` | same-origin `/api` |
| `NEXT_PUBLIC_API_URL` | `http://127.0.0.1:8000` | пусто |
| БД | Docker Postgres (`DATABASE_URL`) | `POSTGRES_URL` |
| Basic Auth | если задан `SITE_ACCESS_PASSWORD` | рекомендуется |

Деплой: [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md)

---

## См. также

- [UI_AND_3D.md](./UI_AND_3D.md) — UI и 3D-сцены  
- [ASSISTANT.md](./ASSISTANT.md) — логика консультанта  
- [API.md](./API.md) — все эндпоинты  
