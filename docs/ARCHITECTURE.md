<<<<<<< HEAD
# Архитектура — Сбер AI-навигатор (как реализовано)

## 1. Обзор

**Frontend (Next.js 15)** + **Backend (FastAPI)**. Две 3D-сцены: космическая карта разделов и **портрет консультанта** в панели чата. Ответы ассистента содержат ссылки на **sberbank.ru**.

```mermaid
graph TB
    U([Пользователь]) --> FE[Next.js]

    subgraph FE
        CH[AssistantPanel]
        POR[CharacterRoomScene — портрет GLB]
        MAP[Scene3D — планеты]
        ZS[Zustand stores]
    end

    FE -->|POST /api/chat/guest| API[FastAPI]

    subgraph API
        AIS[AssistantService]
        LINKS[sber_links.py]
        PRD[ProductService]
        NAV[NavigationService]
    end

    AIS --> LLM[OpenRouter / rule-based]
    PRD --> DB[(SQLite)]
    NAV --> JSON[app_map.json]
=======
# 🏗️ Архитектура проекта — SberAI Assistant

## 1. Варианты архитектуры

### Вариант A — Monolith (Full-Stack Next.js)

```
┌─────────────────────────────────────────┐
│          Next.js (монолит)              │
│  ┌──────────┐  ┌──────────────────────┐ │
│  │   Pages  │  │   API Routes         │ │
│  │  + 3D    │  │  /api/chat           │ │
│  │  + UI    │  │  /api/products       │ │
│  └──────────┘  │  /api/navigation     │ │
│                └──────────────────────┘ │
│                        │                │
│                   OpenAI API            │
│                   SQLite               │
└─────────────────────────────────────────┘
```

**Плюсы:** Минимум инфраструктуры, быстрый старт, один репозиторий  
**Минусы:** Python AI-библиотеки недоступны, сложнее масштабировать  

---

### Вариант B — Frontend + Backend ✅ ВЫБРАН

```
┌─────────────────┐        ┌──────────────────────┐
│  Next.js        │  HTTP  │  FastAPI             │
│  (Frontend)     │◄──────►│  (Backend)           │
│                 │        │                      │
│  - Чат UI       │        │  - AI логика         │
│  - 3D сцена     │        │  - Навигация         │
│  - Навигация    │        │  - Продукты          │
│  - Состояние    │        │  - Auth              │
└─────────────────┘        └──────────────────────┘
                                    │
                           ┌────────┴────────┐
                           ▼                 ▼
                      OpenAI API         SQLite DB
```

**Плюсы:** Чёткое разделение, Python для AI, независимый деплой  
**Минусы:** Два сервиса для запуска  
**Выбран для MVP** — оптимальный баланс простоты и расширяемости  

---

### Вариант C — Microservice-Lite

```
┌──────────┐   ┌───────────┐   ┌──────────────┐   ┌──────────────┐
│ Frontend │──►│ API       │──►│ AI Service   │   │ Nav Service  │
│ Next.js  │   │ Gateway   │   │ (FastAPI)    │   │ (FastAPI)    │
└──────────┘   └───────────┘   └──────────────┘   └──────────────┘
```

**Плюсы:** Масштабируемость, независимые деплои  
**Минусы:** Излишняя сложность для MVP, оверинжиниринг  

---

## 2. Выбранная архитектура — детально (Вариант B)

```mermaid
graph TB
    U([👤 Пользователь]) --> FE

    subgraph FE ["Frontend — Next.js 14"]
        CH[ChatInterface] --> ST[Zustand Store]
        ST --> 3D[Three.js Scene]
        ST --> NAV[NavigationPanel]
        ST --> BTN[ActionButtons]
    end

    FE -->|POST /api/chat| BE

    subgraph BE ["Backend — FastAPI"]
        RT[Router] --> AUTH[JWT Auth]
        AUTH --> AIS[AI Service]
        AUTH --> NS[Navigation Service]
        AUTH --> PS[Products Service]
        AIS --> OAI[(OpenAI GPT-4o)]
        NS --> NDB[(App Map JSON)]
        PS --> DB[(SQLite)]
    end

    BE -->|ChatResponse| FE
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
```

---

<<<<<<< HEAD
## 2. 3D-консультант (фактическая реализация)

### Модель `personage.glb`

- Загрузка: `GlbCharacter3D` + `useGLTF`
- Авто-масштаб: `fitGlbModel.ts` (~1.65 m)
- **Нет** skeleton / animations / morph → режим **говорящая голова**

### Режим портрета (`NEXT_PUBLIC_CHARACTER_HEAD_PORTRAIT=true`)

| Компонент | Назначение |
|-----------|------------|
| `HeadStudioBackdrop` | Тёмный фон, свет на лицо |
| `analyzeModel.ts` | Верхний меш = голова, точка рта |
| `ProceduralMouth` | Липсинг без morph targets |
| `lipSync.ts` | Таймлайн по тексту ответа |
| `useCharacterBehavior` | Без ходьбы для static mesh |
| `SpeechBubble3D` | Реплика над головой |

### Fallback

Если GLB не загрузился → `Humanoid3D` (процедурный человек).

---

## 3. Поток чата

```mermaid
sequenceDiagram
    participant U as Пользователь
    participant FE as Frontend
    participant BE as FastAPI

    U->>FE: сообщение
    FE->>FE: think (3D)
    FE->>BE: POST /api/chat/guest
    BE-->>FE: message + sberbank.ru + products
    FE->>FE: talk + lipSync + облачко
    FE-->>U: кликабельные ссылки
=======
## 3. Схема обработки запроса пользователя

```mermaid
sequenceDiagram
    actor User as 👤 Пользователь
    participant FE as Frontend
    participant BE as Backend API
    participant AI as AI Module
    participant NAV as Navigation Module
    participant DB as Database

    User->>FE: «Где взять кредит под 5%?»
    FE->>BE: POST /api/chat {message, context, userId}

    BE->>AI: process_message(message, history)
    AI->>AI: Intent detection (кредит, ставка 5%)
    AI-->>BE: intent={type: "find_product", params: {type: "credit", rate: 5}}

    BE->>DB: query products WHERE type=credit AND rate<=5
    DB-->>BE: [{id: 1, name: "Кредит наличными", rate: 4.9, url: "/loans/cash"}]

    BE->>NAV: get_navigation_path("credit_products")
    NAV-->>BE: {path: ["Главная", "Кредиты", "Кредит наличными"], url: "/loans/cash"}

    BE-->>FE: {message, products, navigation_path, action_buttons}

    FE->>FE: Render chat message
    FE->>FE: Animate 3D navigation path
    FE->>FE: Show action buttons
    FE-->>User: Ответ + визуальный маршрут
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
```

---

<<<<<<< HEAD
## 4. Frontend — структура

| Путь | Описание |
|------|----------|
| `components/assistant/` | Чат, панель, настройки персонажа |
| `components/assistant/character3d/` | Canvas комнаты, GLB, рот, фон |
| `components/three/` | Карта-планеты |
| `store/assistantStore.ts` | Сообщения, navigation_path |
| `store/characterStore.ts` | Имя, цвета (persist) |
| `store/characterBehaviorStore.ts` | idle / think / talk / walk |
| `store/modelCapabilitiesStore.ts` | static, morph, portrait |

---

## 5. Backend

| Модуль | Файл |
|--------|------|
| Чат | `api/chat.py` — `/api/chat/guest` |
| AI | `services/ai/assistant.py` |
| Ссылки Сбера | `services/sber_links.py` |
| Продукты | `db/seed.py` — URL на sberbank.ru |
| Навигация (демо) | `ai/knowledge/app_map.json` |

`navigation_path` — внутренние пути (`/loans`). Кнопки и продукты — **внешние** URL Сбера.

---

## 6. API

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/health` | Статус, `ai_mode` |
| POST | `/api/chat/guest` | Чат без JWT |
| GET | `/api/products` | Каталог |
| GET | `/api/navigation/map` | JSON карты |

---

## 7. Ограничения MVP

- `personage.glb` без morph — липсинг упрощённый
- История чата в БД не реализована
- Не официальный продукт СберБанка

Подробнее о моделях: [CHARACTER_3D.md](./CHARACTER_3D.md)
=======
## 4. Схема навигации по банковскому приложению

```mermaid
graph TD
    HOME[🏠 Главная] --> LOANS[💳 Кредиты]
    HOME --> DEPOSITS[🏦 Вклады]
    HOME --> PAYMENTS[💸 Платежи]
    HOME --> INVEST[📈 Инвестиции]
    HOME --> PROFILE[👤 Профиль]

    LOANS --> CASH_LOAN[Кредит наличными]
    LOANS --> MORTGAGE[Ипотека]
    LOANS --> AUTO[Автокредит]
    LOANS --> REFINANCE[Рефинансирование]

    DEPOSITS --> CLASSIC[Классический вклад]
    DEPOSITS --> SAVINGS[Накопительный счёт]
    DEPOSITS --> CHILD[Детский вклад]

    PAYMENTS --> TRANSFER[Переводы]
    PAYMENTS --> UTILITIES[ЖКХ]
    PAYMENTS --> PHONE[Мобильная связь]

    INVEST --> STOCKS[Акции / ETF]
    INVEST --> BONDS[Облигации]
    INVEST --> IIS[ИИС]

    style HOME fill:#1a73e8,color:#fff
    style LOANS fill:#34a853,color:#fff
    style DEPOSITS fill:#fbbc04,color:#000
    style PAYMENTS fill:#ea4335,color:#fff
    style INVEST fill:#9c27b0,color:#fff
```

---

## 5. Поток данных и состояния (Frontend)

```mermaid
stateDiagram-v2
    [*] --> Idle : Загрузка приложения

    Idle --> Typing : Пользователь вводит
    Typing --> Loading : Отправка запроса

    Loading --> Responding : Получен ответ от API
    Loading --> Error : Ошибка сети/API

    Responding --> Animating3D : Есть navigation_path
    Responding --> Idle : Нет навигации

    Animating3D --> ShowingButtons : Анимация завершена
    ShowingButtons --> Idle : Пользователь кликнул

    Error --> Idle : Повтор/закрытие
```

---

## 6. Структура API

| Метод | Эндпоинт | Описание |
|-------|----------|----------|
| `POST` | `/api/auth/login` | Авторизация |
| `POST` | `/api/auth/refresh` | Обновление токена |
| `POST` | `/api/chat` | Отправка сообщения ассистенту |
| `GET` | `/api/chat/history` | История диалога |
| `GET` | `/api/products` | Список банковских продуктов |
| `GET` | `/api/products/{id}` | Детали продукта |
| `GET` | `/api/navigation/map` | Карта навигации |
| `GET` | `/api/navigation/path/{section}` | Путь к разделу |

---

## 7. Модель ответа ассистента

```typescript
interface AssistantResponse {
  message: string;                    // Текст ответа
  navigation_path?: NavigationStep[]; // Путь в приложении
  products?: BankProduct[];           // Найденные продукты
  action_buttons?: ActionButton[];    // Кнопки действий
  three_d_scene?: SceneConfig;        // Конфигурация 3D-анимации
}

interface NavigationStep {
  label: string;    // "Кредиты"
  url: string;      // "/loans"
  icon?: string;    // "credit_card"
}

interface BankProduct {
  id: string;
  name: string;
  type: "credit" | "deposit" | "investment";
  rate: number;
  url: string;
  highlight: string; // Краткое описание
}

interface ActionButton {
  label: string;  // "Оформить кредит"
  url: string;    // "/loans/cash/apply"
  variant: "primary" | "secondary";
}
```
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
