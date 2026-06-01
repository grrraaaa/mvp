# Документация SBBOL Demo (MVP)

Демо интернет-банка **СберБизнес** с AI-консультантом, 3D-картой услуг и заполнением платёжных форм.

| Ссылка | Описание |
|--------|----------|
| [../README.md](../README.md) | Обзор проекта, быстрый старт |
| [LOCAL_DEV.md](./LOCAL_DEV.md) | Локальный запуск, проверка ИИ |
| [VERCEL_DEPLOY.md](./VERCEL_DEPLOY.md) | Деплой на Vercel |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Архитектура FE + BE |
| [TECH_STACK.md](./TECH_STACK.md) | Стек технологий |
| [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) | Структура файлов |
| [MODULES.md](./MODULES.md) | Модули и ответственность |
| [UI_AND_3D.md](./UI_AND_3D.md) | UI, адаптив, 3D-сцены |
| [CHARACTER_3D.md](./CHARACTER_3D.md) | GLB-консультант, липсинк |

**Прод:** https://mvp-beta-umber.vercel.app  
**Репозиторий:** https://github.com/grrraaaa/mvp

---

## Возможности (кратко)

- Страницы SBBOL: `/payments`, `/statement`, `/salary`, формы `PAYDOCBY`, `paydoccur`, instant
- AI-чат: OpenRouter/OpenAI + rule-based fallback
- Голосовой ввод (Web Speech API), OCR с фото (ImageToText)
- 3D-карта услуг (планеты → sber-bank.by)
- 3D-консультант в панели чата (`personage.glb`)
- Деплой: один проект Vercel (Next.js + FastAPI Python)

---

## Переменные окружения

См. [../.env.example](../.env.example).

Обязательно для LLM: `OPENAI_API_KEY`, `OPENAI_BASE_URL`.  
На Vercel: `NEXT_PUBLIC_API_URL` пустой; локально: `http://127.0.0.1:8000`.

---

## Команды

```powershell
# Локально
cd mvp\backend && python -m uvicorn main:app --reload --port 8000
cd mvp\frontend && npm run dev

# Сборка фронта
cd mvp\frontend && npm run build

# Деплой
cd mvp && vercel --prod
```
