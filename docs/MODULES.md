# Модули

## Frontend

| Модуль | Файлы | Задача |
|--------|-------|--------|
| Shell | `SbbolShell`, `SbbolAppLayout`, `PlanetNavSlider` | Layout, навигация, слайдер планет |
| SBBOL pages | `CapturedSbbolPage`, `SbbolRoutePage`, `PaymentFormPageContent` | Страницы демо |
| AI Chat | `AssistantFloatingChat`, `AssistantPanel`, `ChatInput` | Чат, микрофон, OCR |
| TTS UI | `AssistantVoicePicker`, `useAssistantSpeech`, `ttsStore` | Озвучка и выбор голоса |
| 3D Map | `PlanetMapOverlay`, `SolarSystemScene`, `SberSolarSystem` | Карта разделов |
| 3D Character | `CharacterRoomScene`, `GlbCharacter3D`, `mouthVertexDeform` | Консультант Алексей |
| Form AI | `useSbbolFormFill`, `assistantQuickChips` | Заполнение форм |
| Character settings | `CharacterSettings`, `characterStore` | Имя, пресеты, голос |

## Backend

| Модуль | Файлы | Задача |
|--------|-------|--------|
| Chat | `api/chat.py`, `services/ai/assistant.py` | LLM + rules + SBBOL |
| Navigation | `services/navigation/demo_routes.py`, `navigation_service.py` | Демо-маршруты |
| Links | `services/sber_links.py` | Промпт и ссылки только SBBOL |
| TTS | `api/tts.py`, `services/tts/*` | Speechify / Soniox / Deepgram |
| Forms | `api/forms.py`, `services/ocr/` | OCR платёжек |
| Products | `api/products.py`, `db/seed.py` | Каталог |
| Auth | `api/auth.py`, `core/site_auth.py` | JWT + Basic Auth |
| DB | `db/database.py`, `core/db_url.py` | Postgres / SQLite |

## Интеграции

| Сервис | Env | Документ |
|--------|-----|----------|
| OpenRouter | `OPENAI_*` | [ASSISTANT.md](./ASSISTANT.md) |
| Speechify | `SPEECHIFY_*` | [TTS.md](./TTS.md) |
| ImageToText | `IMAGETOTEXT_*` | [API.md](./API.md) |
| Vercel Postgres | `POSTGRES_URL` | [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) |

См. [UI_AND_3D.md](./UI_AND_3D.md), [FILE_STRUCTURE.md](./FILE_STRUCTURE.md).
