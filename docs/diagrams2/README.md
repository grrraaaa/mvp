# diagrams2 — UML-диаграммы SBBOL Demo

Красивая HTML-версия use case и state diagram по всему MVP. Стрелки проложены **ортогонально** (только горизонталь/вертикаль), без пересечений.

## Файлы

| Файл | Содержание |
|------|------------|
| [index.html](./index.html) | Обзор и навигация |
| [use-cases.html](./use-cases.html) | 36 UC — обзор + 5 вкладок по доменам (классический UML) |
| [state-machines.html](./state-machines.html) | 5 автоматов (документ, шлюз, AI pipeline, form fill, чат) |
| [_shared.css](./_shared.css) | Общие стили |
| [_diagram.js](./_diagram.js) | Manhattan routing, подсветка по клику |

## Как открыть

```powershell
# из папки diagrams2
start index.html

# или локальный сервер
cd mvp/docs/diagrams2
npx --yes serve .
```

## Покрытие проекта

- **Frontend:** Next.js 15, BankingShell, AssistantPanel, FormFillBridge, 3D character
- **Backend:** FastAPI, assistant.py, queries.py, gateway_sim, repeat_payment
- **Интеграции:** OpenRouter, TTS, OCR, PostgreSQL, 1С (демо)

Предыдущая версия: [../diagrams/system-state-and-use-cases.html](../diagrams/system-state-and-use-cases.html)
