# 3D-консультант (Алексей)

Модель по умолчанию: **`frontend/public/models/personage.glb`** (~20 MB, Sketchfab scan).

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
| `PORTRAIT_CAMERA_Z` | **6.9** | Дистанция камеры (desktop / полная панель) |
| `PORTRAIT_CAMERA_Z_COMPACT` | **7.5** | Встроенный чат (compact) |
| `PORTRAIT_CAMERA_FOV` | **36** | Угол обзора |
| `PORTRAIT_CAMERA_Y_OFFSET` | **-0.22** | Высота камеры (отриц. = ниже) |
| `PORTRAIT_TARGET_Y_OFFSET` | **-0.16** | Точка взгляда (отриц. = ниже) |
| OrbitControls `minDistance` | **4.6** | Минимальный зум |
| OrbitControls `maxDistance` | **8.8** | Максимальный зум |

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
| `filterGlbScene.ts` | Удаление мебели/окружения из сцены |
| `mouthVertexDeform.ts` | Липсинг без morph targets |
| `analyzeModel.ts` | Якорь головы / рта |
| `ProceduralMouth.tsx` | Fallback-рот |
| `fitGlbModel.ts` | Масштаб ~1.65 m |
| `lipSync.ts` | Таймлайн открытия рта по тексту |
| `modelCapabilitiesStore.ts` | Флаги portrait / morph |

---

## Настройки в UI

⚙ **Настройки консультанта** (`CharacterSettings.tsx`): имя, пресеты, **голос озвучки** (если Speechify).

См. [TTS.md](./TTS.md), [UI_AND_3D.md](./UI_AND_3D.md).
