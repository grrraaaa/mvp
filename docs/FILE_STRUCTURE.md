# Структура файлов (актуальная)

```
mvp/
├── README.md
├── .env.example
├── docker-compose.yml
│
├── frontend/
│   ├── app/
│   │   ├── layout.tsx              # Метаданные «Сбер · AI-навигатор»
│   │   ├── page.tsx                # Главная: 3D-карта + панель чата
│   │   └── globals.css             # Тема Сбера, sber-* классы
│   │
│   ├── components/
│   │   ├── assistant/
│   │   │   ├── AssistantPanel.tsx
│   │   │   ├── AssistantCharacter.tsx
│   │   │   ├── MessageBubble.tsx   # Ссылки sberbank.ru
│   │   │   ├── ChatInput.tsx
│   │   │   ├── ProductCard.tsx
│   │   │   ├── ActionButtons.tsx
│   │   │   ├── CharacterSettings.tsx
│   │   │   ├── AssistantAvatar.tsx
│   │   │   └── character3d/
│   │   │       ├── CharacterRoomScene.tsx   # портрет, Canvas
│   │   │       ├── GlbCharacter3D.tsx       # personage.glb
│   │   │       ├── ProceduralMouth.tsx      # липсинг без morph
│   │   │       ├── HeadStudioBackdrop.tsx
│   │   │       ├── Humanoid3D.tsx          # fallback
│   │   │       └── ...
│   │   ├── lib/assistant/analyzeModel.ts
│   │   └── store/modelCapabilitiesStore.ts
│   │   ├── navigation/
│   │   │   └── NavigationPanel.tsx
│   │   └── three/
│   │       ├── Scene.tsx
│   │       ├── AppMap3D.tsx
│   │       └── PlanetNode.tsx
│   │
│   ├── hooks/
│   │   └── useCharacterBehavior.ts
│   │
│   ├── lib/
│   │   ├── sber/theme.ts           # Цвета бренда
│   │   ├── assistant/              # characterTypes, presets, lipSync
│   │   └── api/
│   │
│   └── store/
│       ├── assistantStore.ts
│       ├── characterStore.ts
│       └── characterBehaviorStore.ts
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── api/
│   │   ├── chat.py
│   │   ├── products.py
│   │   ├── navigation.py
│   │   └── auth.py
│   ├── services/
│   │   ├── ai/assistant.py
│   │   ├── sber_links.py           # URL sberbank.ru
│   │   ├── navigation/navigation_service.py
│   │   └── products/product_service.py
│   ├── db/
│   │   ├── database.py
│   │   ├── models.py
│   │   └── seed.py
│   └── core/config.py
│
├── ai/knowledge/
│   └── app_map.json                # Демо-карта разделов (/loans, …)
│
└── docs/
    ├── ARCHITECTURE.md
    ├── TECH_STACK.md
    ├── FILE_STRUCTURE.md
    └── MODULES.md                  # (может содержать устаревшие детали)
```

## Ключевые точки входа

| Задача | Файл |
|--------|------|
| Запуск API | `backend/main.py` |
| Логика ответов + Сбер URL | `backend/services/ai/assistant.py`, `sber_links.py` |
| Главный UI | `frontend/app/page.tsx` |
| 3D-консультант | `frontend/components/assistant/character3d/Humanoid3D.tsx` |
| Тема Сбера | `frontend/app/globals.css`, `lib/sber/theme.ts` |
