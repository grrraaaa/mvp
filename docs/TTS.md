# Озвучка ассистента

В UI доступны голоса **Google** и **Deepgram** (если заданы ключи). Выбор голоса маршрутизируется автоматически.

## Ключи

```env
GOOGLE_TTS_API_KEY=...          # Google Cloud Text-to-Speech
DEEPGRAM_API_KEY=...            # Deepgram Aura-2
TTS_DEFAULT_VOICE=ru-RU-Neural2-B
```

Без ключей — fallback на gTTS / Edge (см. `gtts_tts.py`).

## Google (русский, Neural2)

| id | Пол |
|----|-----|
| `ru-RU-Neural2-B` | мужской (по умолчанию) |
| `ru-RU-Neural2-A` | женский |
| `ru-RU-Wavenet-B` | мужской (Wavenet) |
| `ru-RU-Wavenet-A` | женский (Wavenet) |

## Deepgram (лучшие для русского текста на EN-модели)

| id | Пол | Модель |
|----|-----|--------|
| `arcas` | мужской | aura-2-arcas-en |
| `orpheus` | мужской (уверенный) | aura-2-orpheus-en |
| `thalia` | женский | aura-2-thalia-en |
| `helena` | женский (дружелюбный) | aura-2-helena-en |

> У Deepgram Aura нет отдельной ru-модели; выбранные EN-голоса лучше всего читают кириллицу.

## Смена голоса

Выпадающий список в шапке чата — две группы: **Google** и **Deepgram**.
