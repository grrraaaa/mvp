# UI, адаптивность и 3D

## Две 3D-сцены

| Сцена | Где открывается | Файлы |
|-------|-----------------|--------|
| **Карта услуг** | Кнопка «Карта услуг» в шапке | `PlanetMapOverlay` → `SolarSystemScene` → `SberSolarSystem` |
| **Студия консультанта** | Панель AI-чата | `CharacterRoomScene` → `StudioBackdrop` + `CharacterAvatar3D` |

Не путать: карта — космос и орбиты; чат — студия с GLB-персонажем.

---

## Карта услуг (планеты)

- Фон: тёмный космос `#060f1a`, мягкий туман, ~1800 звёзд
- Планеты по данным `lib/sber/planetMap.ts`
- Клик → `sber-bank.by` в новой вкладке
- Подсветка орбиты из чата (`navigationPath` в `assistantStore`)
- Управление: вращение мышью, зум, авто-вращение (пауза при hover)

Настройка цветов: `lib/sber/theme.ts` (`spaceBg`, `spaceFog`, `planet.*`).

---

## Студия консультанта

Компонент **`StudioBackdrop`** (`components/assistant/character3d/StudioBackdrop.tsx`):

- Мягкий задник и круглый пол (без сетки и «кубической» мебели)
- Кольцевой акцентный свет (фирменный teal/зелёный)
- Режим **`light`**: светлая студия для встроенного чата СББОЛ
- Режим **`wide`**: полный кадр; **`portrait`**: крупный план лица (`NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT`)

Высота блока 3D в чате:

| Режим | Высота |
|-------|--------|
| Mobile compact | 72px |
| Embedded desktop | 148–172px |
| Полная панель | 200–300px |

Переменные GLB: см. [CHARACTER_3D.md](./CHARACTER_3D.md).

---

## Адаптивность сайта

| Breakpoint | Поведение |
|------------|-----------|
| `< 640px` | Мобильный чат (bottom sheet), компактные кнопки |
| `< 1024px` | Скрытый sidebar → гамбургер |
| `≥ 1024px` | Sidebar 104px, flyout-подменю |

### Иконки (размеры)

- Навигация sidebar: **28px** (`NavIcon`, `w-7 h-7`)
- Шапка (телефон, колокол, почта): **24px** (`w-6 h-6`)
- Кнопки шапки: **44–48px** (`.sbbol-icon-btn`)
- Чат FAB: **56–60px** (`IconChat`)
- Микрофон / отправка в чате: **40–48px** кнопки, иконки **20–24px**
- Микрофон: компонент **`IconMic`** (исправленный SVG, без битого path)

### Стили

- Токены СББОЛ: `globals.css` (`--sbbol-*`)
- Утилита контента: `.sbbol-page-wrap` (отступы и max-width)
- Тема чата: класс `.sbbol-theme` на панели ассистента

---

## Чат и API

- Запросы: `apiUrl('/api/chat/guest')` — same-origin на Vercel
- Ошибка «Не удалось связаться с сервером» → проверьте бэкенд и `/api/health`
- Голос: `useWebSpeechInput` + кнопка `IconMic`

---

## Кастомизация

| Задача | Файл |
|--------|------|
| Цвета 3D | `lib/sber/theme.ts` |
| Планеты / URL | `lib/sber/planetMap.ts` |
| Подсказки чата | `lib/sbbol/assistantQuickChips.ts` |
| Shell / nav | `components/layout/SbbolShell.tsx` |
| Иконки | `components/sbbol/SbbolIcons.tsx` |
