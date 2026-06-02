# AI-консультант (СберБизнес)

Консультант в демо называется **Алексей** (имя настраивается в `characterStore`). Отвечает только в контексте **интернет-банка СберБизнес**, не retail-сайта.

---

## Режимы работы

| Режим | Условие |
|-------|---------|
| **LLM** | Задан `OPENAI_API_KEY` (+ `OPENAI_BASE_URL` для OpenRouter) |
| **Rule-based** | Нет ключа или ошибка API |

Проверка: `GET /api/health` → поле `ai_mode`.

---

## Ограничение тематики (SBBOL)

- Промпт и ссылки: `backend/services/sber_links.py`
- В ответах — внутренние пути демо: `/payments`, `/statement`, `/salary`, …
- Официальный референс продукта: https://sbbol.bps-sberbank.by/
- Retail `sber-bank.by` не используется как целевой сайт в логике чата

---

## Навигация

1. Пользователь пишет запрос («выписка», «зарплатный проект», …).
2. `AssistantService` сопоставляет intent с `demo_routes.py` / `navigation_service.py`.
3. В ответе приходит `navigation_path` — фронт делает `router.push`.
4. Подсветка на 3D-карте: `assistantStore.navigationPath` + `PlanetNavSlider`.

Данные планет: `frontend/lib/sber/planetMap.ts` (URL = маршруты Next.js).

---

## Заполнение форм

На страницах платежей (`/payments/paydocbyn`, …):

- Пользователь: «сумма 100 BYN», «получатель ООО …»
- Бэкенд возвращает `form_actions` → `useSbbolFormFill` подставляет значения в DOM
- OCR: фото документа → `POST /api/forms/ocr-fill` → те же действия

Контекст страницы передаётся: `page_route`, `form_type` в `POST /api/chat/guest`.

---

## Быстрые подсказки (чипы)

`lib/sbbol/assistantQuickChips.ts` — зависят от `pathname`.

---

## Голосовой ввод

`ChatInput` + `useWebSpeechInput` — Web Speech API, язык `ru-RU`.  
После распознавания текст отправляется как обычное сообщение (`onVoiceComplete`).

---

## Озвучка ответов

После каждого нового ответа ассистента `AssistantPanel` вызывает `speak(content)`.

См. [TTS.md](./TTS.md).

---

## 3D-поведение

`useCharacterBehavior` — состояния `idle` / `talk`, облачко речи, таймлайн губ.

См. [CHARACTER_3D.md](./CHARACTER_3D.md).

---

## Примеры запросов для теста

| Запрос | Ожидание |
|--------|----------|
| `выписка по счёту` | `navigation_path`: `/statement` |
| `создать платёжное поручение` | `/payments` или форма |
| `зарплата` | раздел `/salary` |
| На форме: `сумма 500` | `form_actions` с полем суммы |

---

## Файлы

| Область | Путь |
|---------|------|
| API | `backend/api/chat.py` |
| Логика | `backend/services/ai/assistant.py` |
| Маршруты демо | `backend/services/navigation/demo_routes.py` |
| Ссылки | `backend/services/sber_links.py` |
| UI чата | `frontend/components/assistant/AssistantPanel.tsx` |
| Плавающий чат | `AssistantFloatingChat.tsx` |
| Store | `frontend/store/assistantStore.ts` |
