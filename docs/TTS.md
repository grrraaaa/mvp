# Озвучка ответов ассистента (TTS)

Серверный синтез речи для последнего ответа ассистента в чате. Клиент: `hooks/useAssistantSpeech.ts`, `store/ttsStore.ts`.

---

## Провайдеры (приоритет)

| Порядок | Провайдер | Условие | Русский |
|---------|-----------|---------|---------|
| 1 | **Speechify** | `SPEECHIFY_API_KEY` | `simba-multilingual` + `ru-RU` |
| 2 | Soniox | `SONIOX_API_KEY` | `language=ru` / авто |
| 3 | Deepgram | `DEEPGRAM_API_KEY` | ограниченно (англ. модели) |

Если ни один ключ не задан — озвучка через **Web Speech API** браузера (`ru-RU`).

---

## Speechify (рекомендуется)

### Переменные (`mvp/.env`)

```env
SPEECHIFY_API_KEY=...
SPEECHIFY_TTS_MODEL=simba-multilingual
SPEECHIFY_TTS_LANGUAGE=ru-RU
SPEECHIFY_TTS_VOICE=george
SPEECHIFY_TTS_AUDIO_FORMAT=mp3
```

Ключ: https://console.speechify.ai/api-keys

### API бэкенда

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/tts/status` | Включён ли TTS, провайдер, голос по умолчанию, `voice_selection` |
| GET | `/api/tts/voices` | Группы голосов для UI (только Speechify) |
| POST | `/api/tts/speak` | Тело: `{ "text": "...", "voice_id": "mikhail" }` → MP3 |

Реализация: `backend/services/tts/speechify.py`, каталог голосов: `speechify_voices.py` (кэш 1 ч).

### Выбор голоса в UI

- Выпадающий список в шапке плавающего чата
- Блок «Голос озвучки» в настройках консультанта (⚙)
- Кнопка ▶ — прослушать `preview_audio` с Speechify CDN
- Сохранение: `localStorage` ключ `sber-assistant-tts-voice`

**Группы:**

1. **Русские** — 50 голосов с `locale: ru-RU` (Mikhail, Olga, Alexei, …)
2. **Многоязычные** — George, Henry, Oliver, Sabrina, … (русский текст через `simba-multilingual`)

Голос по умолчанию из `.env` (`SPEECHIFY_TTS_VOICE`), обычно `george`.

---

## Включение / выключение озвучки

- Кнопка динамика в шапке чата
- Состояние: `localStorage` `sber-assistant-tts` (`1` / `0`)

---

## Проверка

```powershell
# Статус
Invoke-RestMethod http://127.0.0.1:8000/api/tts/status

# Список голосов (нужен SPEECHIFY_API_KEY)
Invoke-RestMethod http://127.0.0.1:8000/api/tts/voices

# Синтез
$body = '{"text":"Добрый день! Я консультант СберБизнес.","voice_id":"mikhail"}'
Invoke-RestMethod -Uri http://127.0.0.1:8000/api/tts/speak -Method POST `
  -ContentType "application/json; charset=utf-8" `
  -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -OutFile test.mp3
```

На Vercel добавьте `SPEECHIFY_API_KEY` в Environment Variables и сделайте Redeploy.

---

## Связь с 3D (липсинг)

Озвучка и движение рта **независимы**: липсинг строится по тексту ответа (`lipSync.ts` / `mouthVertexDeform.ts`), а не по аудио-анализу. См. [CHARACTER_3D.md](./CHARACTER_3D.md).
