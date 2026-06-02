# Документация SBBOL Demo (MVP)

Полное описание демо **СберБизнес** с AI-консультантом (Алексей), 3D-навигацией по разделам, озвучкой ответов и заполнением платёжных форм.

| Документ | Содержание |
|----------|------------|
| [../README.md](../README.md) | Обзор репозитория, быстрый старт |
| [LOCAL_DEV.md](./LOCAL_DEV.md) | Локальный запуск, проверка API и ИИ |
| [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) | Деплой на Vercel (Next.js + FastAPI) |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Архитектура, потоки данных, диаграммы |
| [TECH_STACK.md](./TECH_STACK.md) | Стек и зависимости |
| [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | Дерево каталогов |
| [MODULES.md](./MODULES.md) | Модули frontend / backend |
| [API.md](./API.md) | REST API (эндпоинты, примеры) |
| [ASSISTANT.md](./ASSISTANT.md) | Поведение AI: только СберБизнес, навигация, формы |
| [TTS.md](./TTS.md) | Озвучка Speechify, выбор голоса |
| [UI_AND_3D.md](./UI_AND_3D.md) | UI, адаптив, карта планет, чат |
| [CHARACTER_3D.md](./CHARACTER_3D.md) | 3D-консультант, камера, липсинг |

**Прод:** https://mvp-beta-umber.vercel.app  
**Референс UI:** https://sbbol.bps-sberbank.by/  
**Репозиторий:** https://github.com/grrraaaa/mvp

---

## Возможности

### Интерфейс СберБизнес

- Shell: шапка, sidebar 104px, footer, мобильный гамбургер
- Страницы: `/`, `/payments`, `/statement`, `/salary`, формы `paydocbyn`, `paydoccur`, instant и др.
- Контент: захваченный HTML (`CapturedSbbolPage`) + синтетические страницы (`SyntheticPageBody`)

### AI-консультант

- Чат: плавающая панель (`AssistantFloatingChat`) и встроенная панель
- LLM: OpenRouter / OpenAI (`OPENAI_API_KEY`) или **rule-based** без ключа
- Контекст: только **СберБизнес** (внутренние пути `/…`, не retail `sber-bank.by` в ответах чата)
- Навигация по демо-маршрутам (`demo_routes.py`, `navigation_path` в ответе)
- Заполнение полей форм на страницах платежей (текст + быстрые чипы)
- Голосовой ввод: Web Speech API (`useWebSpeechInput`)
- OCR с фото: ImageToText.com → `POST /api/forms/ocr-fill`

### Озвучка (TTS)

- Провайдер по умолчанию: **Speechify** (`simba-multilingual`, `ru-RU`)
- Выбор голоса в UI: русские (50) + многоязычные (9), сохранение в `localStorage`
- Запасные провайдеры: Soniox, Deepgram
- Без серверного TTS — fallback на `speechSynthesis` браузера

### 3D

- **Карта разделов:** планеты → внутренние URL демо (`planetMap.ts`), слайдер `PlanetNavSlider`
- **Консультант:** `personage.glb`, портретный режим, тёмный фон, камера на дистанции ~6.9 m
- Липсинг: деформация вершин рта (`mouthVertexDeform.ts`) — у скана нет morph targets

---

## Переменные окружения

См. [../.env.example](../.env.example).

| Группа | Ключи |
|--------|--------|
| LLM | `OPENAI_API_KEY`, `OPENAI_BASE_URL`, `OPENAI_MODEL` |
| TTS | `SPEECHIFY_API_KEY`, `SPEECHIFY_TTS_*` |
| OCR | `IMAGETOTEXT_API_KEY`, `IMAGETOTEXT_API_SECRET` |
| БД | `DATABASE_URL` / `POSTGRES_URL` |
| Фронт | `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_CHARACTER_*` |
| Безопасность | `SITE_ACCESS_USER`, `SITE_ACCESS_PASSWORD` |

Локально: `NEXT_PUBLIC_API_URL=http://127.0.0.1:8000`.  
На Vercel: `NEXT_PUBLIC_API_URL` **пустой** (same-origin `/api`).

---

## Команды

```powershell
# Backend
cd mvp\backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000

# Frontend
cd mvp\frontend
npm install
npm run dev

# Сборка
cd mvp\frontend && npm run build

# Деплой
cd mvp && vercel --prod
```

---

## Быстрая проверка

```powershell
Invoke-RestMethod http://127.0.0.1:8000/api/health
Invoke-RestMethod http://127.0.0.1:8000/api/tts/status
```

В браузере: http://localhost:3000 → открыть AI-чат → задать «выписка по счёту» → переход в `/statement`.

Подробные сценарии: [LOCAL_DEV.md](./LOCAL_DEV.md).
