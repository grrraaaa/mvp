# Модули системы — Сбер AI-навигатор

> **Актуальная документация:** [ARCHITECTURE.md](./ARCHITECTURE.md), [TECH_STACK.md](./TECH_STACK.md), [FILE_STRUCTURE.md](./FILE_STRUCTURE.md).  
> Ниже — расширенное описание модулей; часть деталей (аватар-куб, старый стек) устарела.

## Обзор модулей

```
┌─────────────────────────────────────────────────────────────────────┐
│                        SberAI Assistant                             │
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │  AI Module   │  │  Navigation  │  │  Recommendation Engine   │  │
│  │              │  │  Module      │  │                          │  │
│  └──────┬───────┘  └──────┬───────┘  └─────────────┬────────────┘  │
│         │                 │                        │               │
│  ┌──────▼─────────────────▼────────────────────────▼────────────┐  │
│  │                     API Layer                                 │  │
│  └──────────────────────────┬──────────────────────────────────┘  │
│                             │                                      │
│  ┌───────────┐  ┌───────────▼──────────┐  ┌─────────────────────┐ │
│  │   Auth    │  │   3D Visualization   │  │  Analytics/Logging  │ │
│  │  Module   │  │       Module         │  │      Module         │ │
│  └───────────┘  └──────────────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. 🤖 AI Assistant Module

**Расположение:** `backend/services/ai/`

### Ответственность

Основной мозг системы. Принимает сообщение пользователя, определяет намерение (intent), формирует структурированный ответ.

### Компоненты

```
backend/services/ai/
├── assistant.py          # Основной класс AssistantService
├── intent_detector.py    # Определение намерения пользователя
├── context_manager.py    # Управление историей диалога
└── response_builder.py   # Сборка финального ответа
```

### Логика работы

```python
class AssistantService:
    async def process(self, message: str, session_id: str) -> AssistantResponse:
        # 1. Загрузить историю сессии
        history = await self.context_manager.get_history(session_id)

        # 2. Вызвать GPT-4o с function calling
        ai_response = await self.call_openai(message, history)

        # 3. Выполнить вызванные функции (find_products, get_navigation)
        tool_results = await self.execute_tools(ai_response.tool_calls)

        # 4. Собрать финальный ответ
        return self.response_builder.build(ai_response, tool_results)
```

### Промпт-система

```
ai/prompts/
├── system.txt            # Системный промпт (роль ассистента)
├── navigation.txt        # Промпт для навигационных задач
└── products.txt          # Промпт для подбора продуктов
```

**System Prompt (упрощённый):**
> Ты — банковский AI-ассистент. Твоя задача: помогать пользователям находить банковские продукты и услуги. Всегда используй function calling для поиска продуктов и получения путей навигации. Отвечай кратко, по-дружески.

---

## 2. 🗺️ Navigation Module

**Расположение:** `backend/services/navigation/`

### Ответственность

Хранит и отдаёт карту навигации банковского приложения. Строит путь (breadcrumb) к нужному разделу.

### Компоненты

```
backend/services/navigation/
├── navigation_service.py   # Основной сервис
└── app_map.py              # Загрузка карты приложения

ai/knowledge/
└── app_map.json            # Карта всех разделов приложения
```

### Формат карты приложения

```json
{
  "sections": {
    "home": {
      "label": "Главная",
      "url": "/",
      "icon": "home",
      "children": ["loans", "deposits", "payments", "investments"]
    },
    "loans": {
      "label": "Кредиты",
      "url": "/loans",
      "icon": "credit_card",
      "keywords": ["кредит", "займ", "ссуда", "деньги", "рассрочка"],
      "children": ["loans_cash", "loans_mortgage", "loans_auto"]
    },
    "loans_cash": {
      "label": "Кредит наличными",
      "url": "/loans/cash",
      "keywords": ["наличные", "потребительский", "кредит наличными"]
    }
  }
}
```

---

## 3. 🔍 Recommendation Engine

**Расположение:** `backend/services/products/`

### Ответственность

Фильтрует и ранжирует банковские продукты по параметрам запроса пользователя.

### Компоненты

```
backend/services/products/
├── product_service.py      # CRUD для продуктов
├── recommender.py          # Логика подбора
└── seed_data.py            # Начальные данные продуктов
```

### Логика рекомендаций (MVP — простые фильтры)

```python
class Recommender:
    async def recommend(self, params: ProductSearchParams) -> list[Product]:
        query = select(Product).where(Product.is_active == True)

        if params.product_type:
            query = query.where(Product.type == params.product_type)

        if params.max_rate:
            query = query.where(Product.rate <= params.max_rate)

        # Сортировка: сначала самые выгодные
        query = query.order_by(Product.rate.asc())

        return await db.execute(query).scalars().all()
```

---

## 4. 🧊 3D Visualization Module

**Расположение:** `frontend/components/three/`

### Ответственность

Визуализирует навигационный путь в 3D-пространстве. Анимирует переход между разделами приложения.

### Компоненты

```
frontend/components/three/
├── Scene.tsx               # Основная 3D-сцена (Canvas)
├── AppMap3D.tsx            # 3D-карта банковского приложения
├── NavigationPath.tsx      # Анимация пути навигации
├── SectionNode.tsx         # Один раздел приложения (узел)
├── AssistantAvatar.tsx     # 3D-аватар ассистента
└── CameraController.tsx    # Управление камерой
```

### Концепция 3D-сцены

```
Вид сверху на 3D-карту банковского приложения:

        [💳 Кредиты]
             |
[🏦 Вклады] — [🏠 Главная] — [📈 Инвестиции]
             |
        [💸 Платежи]

Когда ассистент указывает путь:
- Узел "Главная" светится
- Линия анимируется к "Кредиты"
- Камера плавно летит к целевому узлу
```

### Пример компонента

```tsx
// NavigationPath.tsx
export function NavigationPath({ steps }: { steps: NavigationStep[] }) {
  const points = steps.map(step => getNodePosition(step.url));

  return (
    <group>
      {points.map((point, i) => (
        <animated.mesh key={i} position={point}>
          <sphereGeometry args={[0.3]} />
          <meshStandardMaterial color="#1a73e8" emissive="#1a73e8" />
        </animated.mesh>
      ))}
      <Line points={points} color="#1a73e8" lineWidth={2} />
    </group>
  );
}
```

---

## 5. 🔌 API Layer

**Расположение:** `backend/api/` + `frontend/lib/api/`

### Backend роуты (FastAPI)

```
backend/api/
├── auth.py          # /api/auth/* — логин, регистрация, refresh
├── chat.py          # /api/chat/* — отправка сообщений, история
├── products.py      # /api/products/* — каталог продуктов
└── navigation.py    # /api/navigation/* — карта, пути
```

### Frontend API-клиент

```
frontend/lib/api/
├── client.ts        # Axios instance с interceptors
├── chat.ts          # Функции для чат-запросов
├── products.ts      # Функции для продуктов
└── auth.ts          # Функции авторизации
```

### Пример API-клиента

```typescript
// frontend/lib/api/chat.ts
export async function sendMessage(message: string, sessionId: string) {
  const response = await apiClient.post<AssistantResponse>('/api/chat', {
    message,
    session_id: sessionId,
  });
  return response.data;
}
```

---

## 6. 🔐 Authentication Module

**Расположение:** `backend/api/auth.py`, `backend/services/auth/`

### Схема JWT-аутентификации

```
1. POST /api/auth/login {email, password}
           │
           ▼
   Проверка credentials в БД
           │
           ▼
   Генерация Access Token (15 мин) + Refresh Token (7 дней)
           │
           ▼
   Ответ: {access_token, refresh_token}

2. Клиент хранит токены в httpOnly cookies

3. Каждый запрос: Authorization: Bearer <access_token>

4. При истечении: POST /api/auth/refresh → новый access_token
```

### Реализация (MVP — минималистичная)

```python
# Зависимость для защищённых роутов
async def get_current_user(token: str = Depends(oauth2_scheme)) -> User:
    payload = jose.jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user = await UserService.get_by_id(payload["sub"])
    return user

# Использование
@router.post("/api/chat")
async def chat(req: ChatRequest, user: User = Depends(get_current_user)):
    ...
```

---

## 7. 📊 Analytics / Logging Module

**Расположение:** `backend/services/analytics/`

### Что логируется (MVP)

```python
# Каждый запрос к ассистенту записывает:
{
  "session_id": "...",
  "user_id": "...",
  "message": "Где взять кредит?",
  "intent": "find_product",
  "products_shown": ["loans_cash", "refinance"],
  "navigation_path": "/loans",
  "response_time_ms": 1240,
  "timestamp": "2026-05-26T10:00:00Z"
}
```

### Зачем нужно

| Метрика | Использование |
|---------|---------------|
| Топ-запросы | Улучшение промптов |
| Средний response_time | Мониторинг производительности |
| Клики на кнопки | Оценка качества рекомендаций |
| Незакрытые сессии | Улучшение UX |

### Хранение

MVP: Таблица `analytics_events` в SQLite  
Production: ClickHouse или Grafana Loki
