# Структура файлов

```
mvp/
├── README.md
├── package.json              # next — для детекции Vercel
├── vercel.json               # FE build + Python /api
├── requirements.txt          # Python deps (Vercel)
├── api/index.py              # Vercel → FastAPI
├── .env.example
├── docker-compose.yml
│
├── docs/                     # Вся документация
│   ├── README.md             # Оглавление
│   ├── LOCAL_DEV.md
│   ├── VERCEL_DEPLOY.md
│   ├── ARCHITECTURE.md
│   ├── UI_AND_3D.md
│   └── ...
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── globals.css       # SBBOL + sber-theme
│   │   ├── middleware.ts
│   │   ├── page.tsx          # Dashboard
│   │   ├── payments/         # Расчёты, формы
│   │   ├── statement/
│   │   └── salary/
│   │
│   ├── components/
│   │   ├── layout/           # SbbolShell, AppProviders
│   │   ├── sbbol/             # CapturedSbbolPage, SbbolRoutePage, иконки
│   │   ├── assistant/          # Чат, ChatInput, IconMic
│   │   │   └── character3d/  # StudioBackdrop, GLB
│   │   ├── three/            # SolarSystemScene, SberSolarSystem
│   │   ├── map/              # PlanetMapOverlay
│   │   └── dashboard/
│   │
│   ├── lib/
│   │   ├── api/              # baseUrl, forms
│   │   ├── sbbol/             # capturedOrigHtml, mockSbbolData, stubToast
│   │   └── sber/              # planetMap, theme
│   │
│   ├── store/
│   ├── hooks/
│   └── public/
│       ├── models/personage.glb
│       └── sber-orig/static/  # CSS/шрифты демо
│
├── backend/
│   ├── main.py
│   ├── api/                  # chat, forms, auth, products
│   ├── services/ai/assistant.py
│   ├── services/navigation/demo_routes.py
│   ├── db/
│   └── core/                 # config, site_auth, db_url
│
└── ai/knowledge/app_map.json
```

**Ключевые имена (SBBOL):** `capturedOrigHtml.ts`, `mockSbbolData.ts`, `stubToast.ts`, `syntheticPageContent.ts`, `CapturedSbbolPage.tsx`, `SyntheticPageBody.tsx`, `SbbolCapturedRoute.tsx`.
