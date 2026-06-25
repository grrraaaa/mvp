# UI, адаптивность и 3D

> Консультант на схемах: [FEATURE_MAP.md §9](./FEATURE_MAP.md#9-3d-консультант-александралександра)

## 3D-сцена: консультант

| Сцена | Где | Компоненты |
|-------|-----|------------|
| **Консультант** | Панель AI-чата | `CharacterRoomScene`, `GlbCharacter3D` |

Чат — портрет Александра/Александры на тёмном фоне (без мебели в GLB).

---

## Консультант в чате

### Визуал

- Тёмный однотонный фон (не студия с полом в портретном режиме)
- Камера **далеко** (Z ≈ 7.8 / 8.5 compact) — видна фигура
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
| Чипы чата | `lib/sbbol/assistantQuickChips.ts` |
| Shell | `components/layout/SbbolShell.tsx` |
| Камера | `lib/assistant/glbCharacter.ts` + env |
| Голос TTS | UI + `QWEN_TTS_VOICE` |

См. [TTS.md](./TTS.md), [ASSISTANT.md](./ASSISTANT.md).
