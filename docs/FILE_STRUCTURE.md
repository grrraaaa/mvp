<<<<<<< HEAD
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
=======
# Файловая структура проекта

```
sber/
│
├── 📄 README.md                        # Главная документация
├── 📄 docker-compose.yml               # Оркестрация сервисов
├── 📄 .env.example                     # Шаблон переменных окружения
├── 📄 .gitignore
│
├── 📁 frontend/                        # ═══ NEXT.JS ПРИЛОЖЕНИЕ ═══
│   ├── 📄 package.json
│   ├── 📄 tsconfig.json
│   ├── 📄 tailwind.config.js
│   ├── 📄 Dockerfile.dev
│   │
│   ├── 📁 app/                         # Next.js App Router
│   │   ├── 📄 layout.tsx               # Root layout (fonts, metadata)
│   │   ├── 📄 page.tsx                 # Главная страница
│   │   ├── 📄 globals.css              # Глобальные стили
│   │   └── 📁 (auth)/                  # Группа страниц авторизации
│   │       ├── 📄 login/page.tsx
│   │       └── 📄 register/page.tsx
│   │
│   ├── 📁 components/
│   │   ├── 📁 assistant/               # Чат-интерфейс ассистента
│   │   │   ├── 📄 AssistantPanel.tsx   # Основная панель (контейнер)
│   │   │   ├── 📄 MessageBubble.tsx    # Пузырь сообщения
│   │   │   ├── 📄 ChatInput.tsx        # Поле ввода
│   │   │   ├── 📄 ProductCard.tsx      # Карточка банковского продукта
│   │   │   └── 📄 ActionButtons.tsx    # Кнопки действий
│   │   │
│   │   ├── 📁 navigation/              # Навигационные элементы
│   │   │   └── 📄 NavigationPanel.tsx  # Breadcrumb-путь
│   │   │
│   │   └── 📁 three/                   # 3D-компоненты (Three.js / R3F)
│   │       ├── 📄 Scene.tsx            # Canvas + освещение + камера
│   │       ├── 📄 AppMap3D.tsx         # 3D-карта банковского приложения
│   │       ├── 📄 SectionNode.tsx      # Узел раздела (куб)
│   │       ├── 📄 NavigationPath.tsx   # Анимация пути
│   │       └── 📄 AssistantAvatar.tsx  # 3D-аватар ассистента
│   │
│   ├── 📁 store/
│   │   └── 📄 assistantStore.ts        # Zustand: состояние чата, навигации
│   │
│   ├── 📁 lib/
│   │   └── 📁 api/
│   │       ├── 📄 client.ts            # Axios instance (interceptors, auth)
│   │       ├── 📄 chat.ts              # API функции чата
│   │       ├── 📄 products.ts          # API функции продуктов
│   │       └── 📄 auth.ts              # API авторизации
│   │
│   └── 📁 hooks/
│       ├── 📄 useChat.ts               # Логика чата
│       └── 📄 useNavigation.ts         # Логика навигации
│
├── 📁 backend/                         # ═══ FASTAPI СЕРВЕР ═══
│   ├── 📄 main.py                      # Точка входа: FastAPI app, middleware
│   ├── 📄 requirements.txt
│   ├── 📄 Dockerfile.dev
│   │
│   ├── 📁 api/                         # HTTP роуты
│   │   ├── 📄 auth.py                  # /api/auth/* — логин, регистрация
│   │   ├── 📄 chat.py                  # /api/chat — ассистент
│   │   ├── 📄 products.py              # /api/products — каталог
│   │   └── 📄 navigation.py            # /api/navigation — карта
│   │
│   ├── 📁 services/                    # Бизнес-логика
│   │   ├── 📁 ai/
│   │   │   └── 📄 assistant.py         # AssistantService (OpenAI + tools)
│   │   ├── 📁 navigation/
│   │   │   └── 📄 navigation_service.py  # NavigationService (app_map.json)
│   │   └── 📁 products/
│   │       └── 📄 product_service.py   # ProductService (DB queries)
│   │
│   ├── 📁 models/
│   │   └── 📄 schemas.py               # Pydantic схемы (request/response)
│   │
│   ├── 📁 db/
│   │   ├── 📄 database.py              # SQLAlchemy engine, session, Base
│   │   └── 📄 models.py                # ORM модели (User, Message, Product)
│   │
│   └── 📁 core/
│       ├── 📄 config.py                # Settings (pydantic-settings)
│       └── 📄 dependencies.py          # FastAPI зависимости (get_current_user)
│
├── 📁 ai/                              # ═══ AI КОНФИГУРАЦИЯ ═══
│   ├── 📁 prompts/
│   │   ├── 📄 system.txt               # Системный промпт ассистента
│   │   └── 📄 navigation.txt           # Промпт навигационного режима
│   │
│   ├── 📁 tools/
│   │   └── 📄 function_definitions.py  # OpenAI Function Calling schemas
│   │
│   └── 📁 knowledge/
│       └── 📄 app_map.json             # Карта навигации (все разделы банка)
│
├── 📁 docs/                            # ═══ ДОКУМЕНТАЦИЯ ═══
│   ├── 📄 ARCHITECTURE.md              # Архитектурные схемы (Mermaid)
│   ├── 📄 TECH_STACK.md                # Обоснование стека
│   ├── 📄 MODULES.md                   # Описание модулей системы
│   ├── 📄 FILE_STRUCTURE.md            # Этот файл
│   └── 📁 diagrams/
│       ├── 📄 sequence_diagram.md      # Sequence диаграммы
│       └── 📄 er_diagram.md            # ER-диаграмма БД
│
└── 📁 assets/                          # ═══ РЕСУРСЫ ═══
    ├── 📁 3d/                          # 3D-модели (.glb, .gltf)
    │   └── 📄 assistant_avatar.glb     # Аватар ассистента
    └── 📁 icons/                       # SVG иконки разделов
```

## Назначение ключевых файлов

| Файл | Назначение |
|------|-----------|
| `frontend/app/page.tsx` | Входная точка UI: компоновка 3D-сцены и панели чата |
| `frontend/components/three/Scene.tsx` | Three.js Canvas с освещением и камерой |
| `frontend/components/three/AppMap3D.tsx` | 3D-карта с узлами банковского приложения |
| `frontend/store/assistantStore.ts` | Глобальное состояние: сообщения, навигация, загрузка |
| `backend/main.py` | FastAPI приложение, CORS, роуты |
| `backend/services/ai/assistant.py` | Ядро AI: OpenAI вызовы + function calling |
| `backend/services/navigation/navigation_service.py` | Построение навигационных путей |
| `ai/knowledge/app_map.json` | JSON-база всех разделов банковского приложения |
| `docker-compose.yml` | Запуск frontend + backend одной командой |
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
