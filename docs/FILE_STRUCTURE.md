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
