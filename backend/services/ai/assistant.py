import json
from openai import AsyncOpenAI
from core.config import settings
from models.schemas import AssistantResponse, NavigationStep, BankProduct, ActionButton
from services.navigation.navigation_service import NavigationService
from services.products.product_service import ProductService


# OpenAI Function Calling definitions
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "find_bank_products",
            "description": "Найти банковские продукты по параметрам пользователя",
            "parameters": {
                "type": "object",
                "properties": {
                    "product_type": {
                        "type": "string",
                        "enum": ["credit", "deposit", "investment", "payment"],
                        "description": "Тип банковского продукта",
                    },
                    "max_rate": {
                        "type": "number",
                        "description": "Максимальная ставка (для кредитов) или минимальная (для вкладов)",
                    },
                    "amount": {"type": "number", "description": "Сумма в рублях"},
                    "term_months": {"type": "integer", "description": "Срок в месяцах"},
                },
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_navigation_path",
            "description": "Получить путь навигации к разделу банковского приложения",
            "parameters": {
                "type": "object",
                "properties": {
                    "section": {
                        "type": "string",
                        "enum": ["loans", "deposits", "payments", "investments", "profile", "home"],
                        "description": "Раздел приложения",
                    }
                },
                "required": ["section"],
            },
        },
    },
]

SYSTEM_PROMPT = """Ты — дружелюбный AI-ассистент банка. 
Помогай пользователям находить банковские продукты и услуги.
Всегда используй функции для поиска продуктов и получения путей навигации.
Отвечай кратко и по делу, на русском языке."""


class AssistantService:
    def __init__(self):
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        self.nav_service = NavigationService()
        self.product_service = ProductService()

    async def process(self, message: str, session_id: str | None, user_id: str) -> AssistantResponse:
        if not session_id:
            import uuid
            session_id = str(uuid.uuid4())

        # Вызов GPT-4o с function calling
        response = await self.client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": message},
            ],
            tools=TOOLS,
            tool_choice="auto",
        )

        ai_message = response.choices[0].message
        navigation_path = None
        products = None
        action_buttons = []

        # Обработка вызовов функций
        if ai_message.tool_calls:
            for tool_call in ai_message.tool_calls:
                args = json.loads(tool_call.function.arguments)

                if tool_call.function.name == "find_bank_products":
                    products = await self.product_service.search(args)
                    if products:
                        action_buttons.append(
                            ActionButton(
                                label=f"Смотреть все {len(products)} предложения",
                                url=f"/products?type={args.get('product_type', '')}",
                                variant="primary",
                            )
                        )

                elif tool_call.function.name == "get_navigation_path":
                    nav_data = self.nav_service.get_path(args["section"])
                    navigation_path = nav_data
                    if nav_data:
                        action_buttons.append(
                            ActionButton(
                                label=f"Перейти в {nav_data[-1].label}",
                                url=nav_data[-1].url,
                                variant="primary",
                            )
                        )

        # Если GPT не вызвал функции — получить финальный текст
        text = ai_message.content or "Я нашёл подходящие варианты для вас!"

        return AssistantResponse(
            message=text,
            session_id=session_id,
            navigation_path=navigation_path,
            products=products,
            action_buttons=action_buttons if action_buttons else None,
        )
