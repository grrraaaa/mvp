# 3D-модели консультанта

| Файл | Имя | Режим ИИ | Голос |
|------|-----|---------|-------|
| `personage.glb` | **Александр** | Руководитель (manager-abilities) | qwen-male |
| `textured_sasha_lady1.glb` | **Александра** | Операционный админ (admin-abilities) | qwen-female |
| `textured_sasha_lady2.glb` | **Александра** | ИП (ip-abilities) | qwen-female |

В карточке «Способности ИИ» в чате показывается, что умеет каждый режим:
- **Руководитель** — подписи, платежи, выплаты, открытие счетов/продуктов.
- **Операционный админ** — безопасность, IP/ЭЦП, API-ключи, сервисы, сотрудники.
- **ИП** — черновики документов, проверка контрагентов, выписки.

Переменные окружения (опционально):

```
NEXT_PUBLIC_CHARACTER_GLB=/models/personage.glb
NEXT_PUBLIC_CHARACTER_PRESET=manager-abilities
```

## Что под капотом

Сцена в `CharacterRoomScene.tsx` использует:
- `Environment` + `<Lightformer>` (студийный IBL без HDR/CDN, рисуется из 5 «софтбоксов»).
- `ContactShadows` — мягкие контактные тени под моделью.
- `SoftShadows` (drei) — PCF-мягкие тени на directional.
- ACES Filmic tone mapping + sRGB output color space.
- `@react-three/postprocessing` — мягкий Bloom + лёгкая виньетка (отключаются в `compact/compactMobile`).
- `Sparkles` — атмосферные искорки вокруг модели (тоже в полном режиме).
