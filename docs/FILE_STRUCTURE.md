# Структура файлов

```
mvp/
├── README.md
├── package.json              # next — детекция Vercel
├── vercel.json
├── requirements.txt          # Python (Vercel)
├── api/index.py              # Vercel → FastAPI
├── .env.example
├── docker-compose.yml
│
├── docs/                     # Полная документация
│   ├── README.md             # Оглавление
│   ├── LOCAL_DEV.md
│   ├── VERCEL_DEPLOY.md
│   ├── ARCHITECTURE.md
│   ├── TECH_STACK.md
│   ├── FILE_STRUCTURE.md
│   ├── MODULES.md
│   ├── API.md
│   ├── ASSISTANT.md
│   ├── TTS.md
│   ├── UI_AND_3D.md
│   └── CHARACTER_3D.md
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx        # ClientRoot
│   │   ├── globals.css
│   │   ├── middleware.ts     # Basic Auth
│   │   ├── page.tsx
│   │   ├── payments/
│   │   ├── statement/
│   │   └── salary/
│   │
│   ├── components/
│   │   ├── layout/           # SbbolShell, PlanetNavSlider
│   │   ├── sbbol/            # CapturedSbbolPage, иконки
│   │   ├── assistant/
│   │   │   ├── AssistantFloatingChat.tsx
│   │   │   ├── AssistantPanel.tsx
│   │   │   ├── AssistantVoicePicker.tsx
│   │   │   ├── CharacterSettings.tsx
│   │   │   └── character3d/  # GLB, камера, липсинг
│   │   ├── three/
│   │   └── map/
│   │
│   ├── lib/
│   │   ├── api/              # baseUrl, tts, forms
│   │   ├── assistant/        # glbCharacter, mouthVertexDeform, lipSync
│   │   ├── sbbol/            # formContext, quickChips, captured HTML
│   │   └── sber/             # planetMap, theme
│   │
│   ├── store/                # assistant, character, tts, behavior
│   ├── hooks/                # useAssistantSpeech, useWebSpeechInput, …
│   └── public/
│       ├── models/personage.glb
│       └── sber-orig/static/
│
├── backend/
│   ├── main.py
│   ├── api/                  # chat, tts, forms, auth, products, navigation
│   ├── services/
│   │   ├── ai/assistant.py
│   │   ├── tts/              # speechify, speechify_voices, soniox, deepgram
│   │   ├── navigation/
│   │   ├── sber_links.py
│   │   └── ocr/
│   ├── db/
│   └── core/                 # config, site_auth, db_url
│
└── ai/knowledge/app_map.json
```

## Ключевые точки входа

| Задача | Файл |
|--------|------|
| Запуск API | `backend/main.py` |
| Чат | `backend/api/chat.py` |
| TTS | `backend/api/tts.py` |
| Главная страница | `frontend/app/page.tsx` |
| Shell банка | `frontend/components/layout/SbbolShell.tsx` |
| 3D консультант | `frontend/components/assistant/character3d/CharacterRoomScene.tsx` |

## Имена SBBOL

`capturedOrigHtml.ts`, `mockSbbolData.ts`, `stubToast.ts`, `syntheticPageContent.ts`, `CapturedSbbolPage.tsx`, `SyntheticPageBody.tsx`.
