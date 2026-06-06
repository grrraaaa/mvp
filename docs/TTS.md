# Озвучка ассистента (Deepgram Aura)

Озвучка ответов AI идёт **только через Deepgram Aura**.

## Переменные окружения

```env
DEEPGRAM_API_KEY=ваш-ключ
DEEPGRAM_TTS_VOICE=alexei
DEEPGRAM_TTS_MODEL=aura-2-arcas-en
```

Ключ: https://console.deepgram.com/

## Как сменить голос

### 1. В интерфейсе чата
В шапке AI-консультанта откройте выпадающий список голосов (рядом с кнопкой 🔊) и выберите нужный. Выбор сохраняется в `localStorage`.

### 2. Голос по умолчанию на сервере
В `.env` или Vercel Environment Variables:

```env
DEEPGRAM_TTS_VOICE=alexei
```

Доступные id: `alexei`, `arcas`, `odysseus`, `apollo`, `mars`, `thalia`, `aurora`, `helena`, `luna` и др. — полный список: `GET /api/tts/voices`.

> **Alexei** — алиас для мужского голоса `aura-2-arcas-en` (в каталоге Deepgram нет отдельной модели `alexei`).

### 3. Полное имя модели Deepgram
Можно указать полный model id, например `aura-2-odysseus-en`, в `DEEPGRAM_TTS_VOICE`.

## API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/tts/status` | Статус TTS |
| GET | `/api/tts/voices` | Список голосов для UI |
| POST | `/api/tts/speak` | `{ "text": "...", "voice_id": "alexei" }` → audio/mpeg |

## Vercel

Добавьте `DEEPGRAM_API_KEY` и `DEEPGRAM_TTS_VOICE=alexei`, удалите старые `SPEECHIFY_*` / `SONIOX_*`, сделайте Redeploy.
