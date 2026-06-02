# UI, адаптивность и 3D

## Две 3D-сцены

| Сцена | Где | Компоненты |
|-------|-----|------------|
| **Карта разделов** | Кнопка в шапке / слайдер планет | `PlanetMapOverlay`, `SolarSystemScene`, `PlanetNavSlider` |
| **Консультант** | Панель AI-чата | `CharacterRoomScene`, `GlbCharacter3D` |

Карта — космос и орбиты; чат — портрет Алексея на тёмном фоне (без мебели в GLB).

---

## Карта разделов

- Фон: `#060f1a`, звёзды, туман (`lib/sber/theme.ts`)
- Планеты: `lib/sber/planetMap.ts` — клик → **внутренний маршрут** (`/payments`, `/statement`, …)
- Подсветка орбиты из чата: `assistantStore.navigationPath`
- Управление: вращение, зум, авто-вращение (пауза при hover)

`PlanetNavSlider` — горизонтальный слайдер разделов в shell (над контентом).

---

## Консультант в чате

### Визуал

- Тёмный однотонный фон (не студия с полом в портретном режиме)
- Камера **далеко** (Z ≈ 8.6 / 9.4 compact) — видна фигура, не только лицо
- Подсказки на карте планет: только у объекта под курсором (планета или спутник)
- Свет: ambient + directional + point у головы
- OrbitControls: ограниченный поворот и зум 4.6–8.8

Подробно: [CHARACTER_3D.md](./CHARACTER_3D.md).

### Высота канваса

| Режим | Высота |
|-------|--------|
| Mobile compact | `min(36dvh, 280px)` |
| Embedded (плавающий чат) | 240px → 280px (sm) |
| Полная панель | 380px → 520px (sm) |

---

## Плавающий чат (СББОЛ)

`AssistantFloatingChat.tsx`:

- FAB справа внизу
- Desktop: перетаскиваемая панель ~400×560
- Mobile: bottom sheet ~94dvh
- Шапка: заголовок, **выбор голоса**, вкл/выкл озвучки, закрыть
- Тело: `AssistantPanel` variant=`embedded`

---

## Адаптивность сайта

| Breakpoint | Поведение |
|------------|-----------|
| `< 640px` | Bottom sheet чата, компактные чипы |
| `< 1024px` | Sidebar скрыт → гамбургер |
| `≥ 1024px` | Sidebar 104px, flyout |

### Иконки

| Место | Размер |
|-------|--------|
| Sidebar nav | 28px |
| Шапка | 24px в кнопках 44–48px |
| Чат FAB | 56–60px |
| Микрофон / отправка | кнопки 40–48px, иконки 20–24px |

Микрофон: `IconMic` + `useWebSpeechInput`.

---

## Чат и API

- `POST /api/chat/guest` — ответ + навигация + form_actions
- `POST /api/tts/speak` — MP3 с выбранным `voice_id`
- `apiUrl()` — same-origin на Vercel

Ошибка связи с сервером → проверить uvicorn и `NEXT_PUBLIC_API_URL`.

---

## Кастомизация

| Задача | Файл |
|--------|------|
| Цвета 3D | `lib/sber/theme.ts` |
| Планеты / маршруты | `lib/sber/planetMap.ts` |
| Чипы чата | `lib/sbbol/assistantQuickChips.ts` |
| Shell | `components/layout/SbbolShell.tsx` |
| Камера | `lib/assistant/glbCharacter.ts` + env |
| Голос TTS | UI + `SPEECHIFY_TTS_VOICE` |

См. [TTS.md](./TTS.md), [ASSISTANT.md](./ASSISTANT.md).
