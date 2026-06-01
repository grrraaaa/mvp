# 3D-консультант: модель и режим «говорящая голова»

## Текущая модель

Файл: **`frontend/public/models/personage.glb`** (~20 MB, Sketchfab).

| Параметр | Значение |
|----------|----------|
| Меши | 3 (`Object_5`, `Object_6`, `Object_7`) |
| Скелет / анимации | нет |
| Morph targets (губы) | нет |

Поэтому в MVP включён **режим портрета**: камера на лицо, студийный фон, **процедурный рот** (`ProceduralMouth.tsx`) синхронизирован с текстом ответа.

---

## Режим «говорящая голова» (по умолчанию)

```env
NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT=true
```

| Поведение | Описание |
|-----------|----------|
| Камера | Крупный план лица (~FOV 32°, дистанция ~0.95 m) |
| Фон | `HeadStudioBackdrop` вместо комнаты со столом |
| Ходьба | **отключена** для статичного GLB |
| Липсинг | morph targets → если есть; иначе **ProceduralMouth** |
| Взгляд | Модель поворачивается к камере при ответе |
| Речь | Облачко + таймлайн из `lipSync.ts` |

Отключить портрет (полная комната + редкая ходьба для rigged-моделей):

```env
NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT=false
```

---

## Подойдёт ли GLB?

**Да.** Предпочтительно **`.glb`** (glTF 2.0).

Положить файл:

```
mvp/frontend/public/models/personage.glb
```

или задать путь:

```env
NEXT_PUBLIC_CHARACTER_GLB=/models/your-model.glb
NEXT_PUBLIC_CHARACTER_GLB_SCALE=1
NEXT_PUBLIC_CHARACTER_GLB_Y=0
```

---

## Как получить **реалистичный** липсинг

Текущий `personage.glb` — статичный скан. Для настоящих губ нужен пересбор:

| Источник | Morph + анимации |
|----------|------------------|
| [Ready Player Me](https://readyplayer.me) | да, из коробки |
| Mixamo + Blender | да, вручную |
| Blender Shape Keys | `jawOpen`, visemes |

При экспорте включить: **Shape Keys**, **Skinning**, **Animation**.

### Желательные morph targets

`jawOpen`, `mouthOpen`, `viseme_aa`, `viseme_O`, `viseme_E`, …

### Желательные анимации

`Idle`, `Walk`, `Talk` (имена ищутся по подстроке в `glbCharacter.ts`).

---

## Как помочь разработке

1. Новый **`.glb`** с morph targets и (опционально) анимациями.
2. Скрин из [gltf.report](https://gltf.report): clips + morph names.
3. Если рот смещён — напишите, подкрутим `analyzeModel.ts` / масштаб рта.

---

## Файлы в коде

| Файл | Роль |
|------|------|
| `GlbCharacter3D.tsx` | Загрузка GLB, портрет, morph / procedural lip |
| `analyzeModel.ts` | Поиск головы и точки рта |
| `ProceduralMouth.tsx` | Рот без morph targets |
| `HeadStudioBackdrop.tsx` | Фон студии |
| `modelCapabilitiesStore.ts` | static / morph / portrait flags |
| `lipSync.ts` | Таймлайн открытия рта по тексту |
| `fitGlbModel.ts` | Масштаб ~1.65 m, ноги на полу |
