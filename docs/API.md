# REST API (FastAPI)

> API в контексте системы: [FEATURE_MAP.md §2](./FEATURE_MAP.md#2-карта-фич-по-слоям) · [ARCHITECTURE.md §4](./ARCHITECTURE.md#4-backend--маршруты)

Базовый URL локально: `http://127.0.0.1:8000`  
На Vercel: `https://<ваш-домен>/api` (тот же origin, что и фронт).

Интерактивная схема: `/docs` (Swagger).

При включённом Basic Auth (`SITE_ACCESS_*`) запросы с браузера идут с теми же учётными данными, что и сайт.

---

## Health

### `GET /api/health`

```json
{
  "status": "ok",
  "version": "0.1.0",
  "db": "postgres",
  "ai_mode": "openrouter",
  "tts": true
}
```

| Поле | Значения |
|------|----------|
| `ai_mode` | `openrouter`, `openai`, `openai-compatible`, `rule-based` |
| `db` | `postgres`, `sqlite` |
| `tts` | есть ли любой TTS-ключ |

---

## Chat

### `POST /api/chat/guest`

Основной эндпоинт чата без JWT.

**Тело:**

```json
{
  "message": "выписка по счёту",
  "session_id": null,
  "page_route": "/statement",
  "form_type": null
}
```

**Ответ (фрагмент):**

```json
{
  "message": "…",
  "session_id": "…",
  "navigation_path": "/statement",
  "products": [],
  "action_buttons": [],
  "form_actions": []
}
```

| Поле | Назначение |
|------|------------|
| `navigation_path` | Внутренний маршрут демо для `router.push` |
| `form_actions` | Заполнение полей на текущей форме |
| `products` | Карточки продуктов (если есть) |

Логика: `services/ai/assistant.py` → демо-навигация → формы → LLM → rules.

---

## TTS

См. [TTS.md](./TTS.md).

| Метод | Путь |
|-------|------|
| GET | `/api/tts/status` |
| GET | `/api/tts/voices` |
| POST | `/api/tts/speak` |

---

## Forms (OCR)

### `POST /api/forms/ocr-fill`

Загрузка изображения платёжки → распознанные поля для подстановки в форму.

Требует `IMAGETOTEXT_API_KEY` и `IMAGETOTEXT_API_SECRET`.

---

## Products

### `GET /api/products`

Каталог продуктов из БД (seed).

---

## Navigation

### `POST /api/navigation/...`

Вспомогательные маршруты навигации (если подключены в роутере).

---

## Auth (заготовка)

`/api/auth/*` — JWT-регистрация/логин; в демо чат использует **guest** без токена.

---

## CORS и origins

`ALLOWED_ORIGINS` в `.env` — список через запятую. На Vercel укажите прод-домен.

---

## Коды ошибок

| Код | Типичная причина |
|-----|------------------|
| 400 | Пустой текст TTS, невалидное тело |
| 401 | Basic Auth |
| 503 | Нет `SPEECHIFY_API_KEY` / TTS не настроен |
| 502 | Ошибка внешнего TTS / LLM |
