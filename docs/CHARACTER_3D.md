# 3D-консультант (Александр / Александра)

> Схема подсистемы: [FEATURE_MAP.md §10](./FEATURE_MAP.md#10-3d-консультант-александралександра)

Модель по умолчанию: **`frontend/public/models/personage.glb`** (~20 MB, Sketchfab scan). Дополнительно — `textured_sasha_lady1.glb`, `textured_sasha_lady2.glb` (выбираются пресетом).

| Параметр | Значение |
|----------|----------|
| Меши | 3 (`Object_5` … `Object_7`) |
| Скелет / клипы | нет |
| Morph targets | нет |

---

## Режим портрета (по умолчанию)

```env
NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT=true
```

| Элемент | Поведение |
|---------|-----------|
| Камера | Далёкий план: видна верхняя часть фигуры, не только лицо |
| Фон | Однотонный тёмный (`#030a08` / `#0a1512` во встроенном чате) |
| Студия / мебель | **Отключены** — `filterGlbScene.ts` убирает объекты окружения из GLB |
| Ходьба | Отключена |
| Липсинг | **Деформация вершин** рта (`mouthVertexDeform.ts`), не morph |
| Fallback рта | `ProceduralMouth` — только если нет vertex rig |

### Камера (текущие значения по умолчанию)

| Константа / env | Значение | Описание |
|-----------------|----------|----------|
| `PORTRAIT_CAMERA_Z` | **7.8** | Дистанция камеры (desktop / полная панель) |
| `PORTRAIT_CAMERA_Z_COMPACT` | **8.5** | Встроенный чат (compact) |
| `PORTRAIT_CAMERA_FOV` | **36** | Угол обзора |
| `PORTRAIT_CAMERA_Y_OFFSET` | **-0.30** | Высота камеры (отриц. = ниже) |
| `PORTRAIT_TARGET_Y_OFFSET` | **-0.22** | Точка взгляда (отриц. = ниже) |
| OrbitControls `minDistance` | **5.2** | Минимальный зум |
| OrbitControls `maxDistance` | **9.5** | Максимальный зум |

Переопределение без правки кода:

```env
NEXT_PUBLIC_PORTRAIT_CAMERA_Z=7.2
NEXT_PUBLIC_PORTRAIT_CAMERA_Z_COMPACT=7.8
NEXT_PUBLIC_PORTRAIT_CAMERA_FOV=38
NEXT_PUBLIC_PORTRAIT_CAMERA_Y_OFFSET=-0.3
NEXT_PUBLIC_PORTRAIT_TARGET_Y_OFFSET=-0.2
```

Источник: `frontend/lib/assistant/glbCharacter.ts`, `PortraitCamera.tsx`, `CharacterRoomScene.tsx`.

**Чем больше Z — тем дальше камера и меньше крупный план лица.**

Доп. масштаб модели в кадре:

```env
NEXT_PUBLIC_CHARACTER_PORTRAIT_SCALE=3
NEXT_PUBLIC_CHARACTER_GLB_SCALE=1
NEXT_PUBLIC_CHARACTER_GLB_Y=0
```

---

## Высота канваса в чате

| Режим | CSS |
|-------|-----|
| Mobile compact | `min(36dvh, 280px)` |
| Embedded (плавающий чат) | `240px` → `280px` (sm) |
| Полная панель | `380px` → `520px` (sm) |

Файл: `CharacterRoomScene.tsx`.

---

## Смена модели

```env
NEXT_PUBLIC_CHARACTER_GLB=/models/your-model.glb
NEXT_PUBLIC_CHARACTER_GLB_SCALE=1
NEXT_PUBLIC_CHARACTER_GLB_Y=0
```

Положить файл в `frontend/public/models/`.

Полная комната (для rigged-моделей с анимациями):

```env
NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT=false
```

---

## Реалистичный липсинг (будущая модель)

Для morph-based губ экспортируйте GLB с shape keys: `jawOpen`, `viseme_*`, клипы `Idle`, `Walk`, `Talk`.

Имена ищутся по подстроке в `glbCharacter.ts` (`LIP_MORPH_NAMES`, `ANIM_IDLE_NAMES`, …).

Источники: Ready Player Me, Mixamo + Blender.

---

## Файлы в коде

| Файл | Роль |
|------|------|
| `GlbCharacter3D.tsx` | Загрузка GLB, липсинг, портрет |
| `CharacterRoomScene.tsx` | Canvas, свет, OrbitControls |
| `PortraitCamera.tsx` | Позиция камеры в портрете |
| `WelcomeCharacter3D.tsx` | Полноразмерный 3D-канвас для `WelcomeScreen` (drag-to-rotate, OrbitControls) |
| `ModelPreview3D.tsx` | **Компактный 3D-превью** для дропдауна `PersonalizationMenu` (фиксированный портретный ракурс, idle-rotation, без OrbitControls) |
| `CharacterAvatar3D.tsx` | Обёртка для основного аватара в чате |
| `filterGlbScene.ts` | Удаление мебели/окружения из сцены |
| `mouthVertexDeform.ts` | Липсинг без morph targets |
| `analyzeModel.ts` | Якорь головы / рта |
| `ProceduralMouth.tsx` | Fallback-рот |
| `fitGlbModel.ts` | Масштаб ~1.65 m |
| `lipSync.ts` | Таймлайн открытия рта по тексту |
| `modelCapabilitiesStore.ts` | Флаги portrait / morph |

---

## `ModelPreview3D` — компактное превью в `PersonalizationMenu`

Используется в дропдауне «⋯» (выбор модели/голоса) вместо плоского эмодзи-аватара. По `modelPath` грузит GLB и показывает его на миниатюрном канвасе (по умолчанию 140 px высотой). Без OrbitControls — фиксированный портретный ракурс, тонкая idle-rotation (`sin(t*0.6) * 0.12` rad по Y) для эффекта «живого» персонажа.

| Параметр | Поведение |
|----------|-----------|
| `modelPath` | Обязательный путь к GLB (`/models/...`). При `null/undefined` использует `DEFAULT_GLB_PATH` |
| `height` | Высота канваса в px (default 150) |
| Камера | `position=(0, headY+0.12, 2.0)`, `fov=32` — голова/плечи в кадре |
| Свет | 1 ambient + 3 directional, как в `WelcomeCharacter3D` |
| Suspense fallback | Wireframe-torus (мятный `#21A038`) на y=1.45 |
| Idle | Запускает первый клип с подстрокой `idle` (если есть); иначе микро-rotation |
| Morph reset | Обнуляет все `morphTargetInfluences` при монтировании, чтобы дефолтный `jawOpen=1` из GLB не «залипал» открытым ртом |

В `PersonalizationMenu` превью перерисовывается при hover/focus на пункт списка моделей — пользователь сразу видит смену внешности до клика.

---

## Настройки в UI

⚙ **Настройки консультанта** (`CharacterSettings.tsx`): пресет (3 шт.), **голос озвучки** (Qwen: `qwen-male` / `qwen-female`).

См. [TTS.md](./TTS.md), [UI.md](./UI.md).
