# 3D-модель консультанта

Текущая модель:

```
personage.glb   (~20 MB)
```

Путь по умолчанию: `/models/personage.glb`

Режим «говорящая голова» (по умолчанию): `NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT=true`

Полная инструкция: [`../../docs/CHARACTER_3D.md`](../../docs/CHARACTER_3D.md)

После замены файла перезапустите `npm run dev`.

Опционально в `.env`:

```env
NEXT_PUBLIC_CHARACTER_GLB=/models/personage.glb
NEXT_PUBLIC_CHARACTER_GLB_SCALE=1
NEXT_PUBLIC_CHARACTER_GLB_Y=0
```
