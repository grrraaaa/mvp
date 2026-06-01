# Модули

## Frontend

| Модуль | Файлы | Задача |
|--------|-------|--------|
| Shell | `SbbolShell`, `SbbolAppLayout` | Layout банка, nav, карта |
| SBBOL pages | `SbbolOrigPageContent`, `PaymentFormPageContent` | HTML-страницы демо |
| AI Chat | `AssistantFloatingChat`, `AssistantPanel`, `ChatInput` | Чат, микрофон, OCR |
| 3D Map | `PlanetMapOverlay`, `Scene3D`, `SberSolarSystem` | Карта услуг |
| 3D Character | `CharacterRoomScene`, `StudioBackdrop`, `GlbCharacter3D` | Консультант |
| Form AI | `useSbbolFormFill`, `assistantQuickChips` | Заполнение форм |

## Backend

| Модуль | Файлы | Задача |
|--------|-------|--------|
| Chat | `api/chat.py`, `services/ai/assistant.py` | LLM + rules + demo nav |
| Forms | `api/forms.py`, `services/ocr/` | OCR платёжек |
| Products | `api/products.py`, `db/seed.py` | Каталог в БД |
| Auth | `core/site_auth.py`, `middleware` (FE) | Basic Auth |
| DB | `db/database.py`, `core/db_url.py` | Postgres / SQLite |

## Интеграции

- **OpenRouter** — `OPENAI_API_KEY` + `OPENAI_BASE_URL`
- **ImageToText** — `IMAGETOTEXT_*` для фото
- **Vercel Postgres** — `POSTGRES_URL`

См. [UI_AND_3D.md](./UI_AND_3D.md) для UI/3D.
