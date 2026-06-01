# Сбер · AI-навигатор (MVP)

Демонстрационный AI-консультант по услугам **ПАО Сбербанк** с 3D-картой разделов, человекоподобным ассистентом в панели чата и **ссылками на официальный сайт** [sberbank.ru](https://www.sberbank.ru/ru/person).

> Это учебный/демо-проект, не является официальным продуктом СберБанка.

---

## Что реализовано

| Модуль | Описание |
|--------|----------|
| **Чат** | Вопросы на русском → ответы с URL `sberbank.ru` |
| **Rule-based + LLM** | OpenRouter/OpenAI или fallback без ключа |
| **Продукты** | Каталог в SQLite, ссылки на разделы Сбера |
| **3D-карта** | Планеты-разделы (кредиты, вклады, платежи, инвестиции) |
| **3D-консультант** | `personage.glb`, режим «говорящая голова», процедурный липсинг — [docs/CHARACTER_3D.md](docs/CHARACTER_3D.md) |
| **Настройка персонажа** | Пол, цвет кожи, костюм, пресеты |
| **Дизайн** | Фирменная зелёная тема Сбера (`#21A038`) |

---

## Быстрый старт

### Требования

- Node.js 20+
- Python 3.11+
- (опционально) ключ [OpenRouter](https://openrouter.ai) или OpenAI

### Запуск

```powershell
# Backend
cd mvp\backend
pip install -r requirements.txt
python -m uvicorn main:app --reload --port 8000

# Frontend (другой терминал)
cd mvp\frontend
npm install
npm run dev
```

Откройте http://localhost:3000 · API: http://localhost:8000/docs

### Переменные окружения

Скопируйте `mvp/.env.example` → `mvp/.env`:

```env
OPENAI_API_KEY=sk-or-v1-...
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=openai/gpt-4o-mini
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_CHARACTER_PRESET=banker-m
```

---

## Структура

```
mvp/
├── frontend/          # Next.js 15, R3F, Zustand
├── backend/         # FastAPI, SQLite, AI
├── ai/knowledge/    # app_map.json — карта разделов
└── docs/            # ARCHITECTURE.md, TECH_STACK.md
```

---

## Документация

- [Архитектура (фактическая)](docs/ARCHITECTURE.md)
- [Стек технологий](docs/TECH_STACK.md)
- [Структура файлов](docs/FILE_STRUCTURE.md)

---

## Официальные ссылки Сбера

Все ответы ассистента и кнопки ведут на разделы [sberbank.ru](https://www.sberbank.ru/ru/person). Маппинг URL — в `backend/services/sber_links.py`.

---

## Лицензия

MIT · демо-проект
