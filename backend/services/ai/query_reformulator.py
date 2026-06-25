"""LLM-нормализатор пользовательских запросов.

Идея: пользователь пишет как попало («здароу браток, надо последние переводы глянуть»),
ассистент должен понять его и переписать в каноническую форму, которую существующий
rule-based pipeline уже умеет обрабатывать («покажи последние переводы»).

Архитектура:
  1. На старте собираем манифест всех поддерживаемых команд (INTENTS + паттерны
     из banking/queries + demo_routes + form-fill).
  2. На каждый входящий message вызываем дешёвую LLM (по умолчанию gpt-4o-mini) с
     системным промптом, в котором перечислен манифест.
  3. LLM возвращает JSON: {canonical, intent, params, confidence}.
  4. Кэшируем по хэшу сообщения — одинаковые запросы не лупим дважды.
  5. Если LLM недоступна / упала / вернула мусор — отдаём оригинал (graceful fallback).
  6. Если confidence >= порога и canonical != original — подменяем message.

Сам по себе реформатор **не принимает решений** о том, что делать. Он только
переписывает текст. Дальше работает обычный pipeline (banking, navigation, form fill, ...).
"""
from __future__ import annotations

import asyncio
import hashlib
import json
import logging
import re
import time
from collections import OrderedDict
from dataclasses import asdict, dataclass, field
from typing import Any, Dict, List, Optional

from core.config import settings

logger = logging.getLogger(__name__)


# ─── Структуры данных ─────────────────────────────────────────────────────────


@dataclass
class CommandSpec:
    """Описание одной поддерживаемой команды для манифеста."""

    intent: str  # машинное имя: "payments_by_name", "report_by_number", ...
    description: str  # человеческое описание для LLM
    examples: List[str] = field(default_factory=list)  # канонические примеры фраз
    section: Optional[str] = None  # раздел SBBOL, если есть
    extra: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ReformulatedQuery:
    """Результат реформации одного сообщения."""

    original: str
    canonical: str
    intent: Optional[str]
    confidence: float
    params: Dict[str, Any]
    via_llm: bool  # True, если реально дёрнули LLM; False — fallback / cache
    elapsed_ms: int = 0


# ─── Сборка манифеста ─────────────────────────────────────────────────────────


def _safe_examples(patterns: List[str], limit: int = 3) -> List[str]:
    """Превратить regex-паттерны в канонические фразы-примеры для LLM.

    LLM лучше понимает «найди платежи <контрагент>», чем «платёж|...|контрагент».
    Поэтому из каждого regex выкидываем группы/метасимволы и подставляем плейсхолдеры.
    """
    out: List[str] = []
    for pat in patterns[:limit]:
        # Грубая очистка regex → читаемая фраза с плейсхолдерами.
        # Это best-effort, не претендуем на идеальность — нужно лишь намекнуть LLM.
        cleaned = re.sub(r"\(\?:|\(\?|\)|\\w\*|\\d\+|\[\^\\w\\s\]\*", "", pat)
        cleaned = re.sub(r"[\^\$\\\[\]\{\}\|\(\)]+", " ", cleaned)
        cleaned = re.sub(r"\s+", " ", cleaned).strip()
        if cleaned:
            out.append(cleaned)
    return out


def _manifest_from_intents() -> List[CommandSpec]:
    """Собрать CommandSpec из INTENTS в assistant.py."""
    from services.ai.assistant import INTENTS  # поздний импорт, чтобы не зациклиться

    specs: List[CommandSpec] = []
    for ic in INTENTS:
        # Берём первый паттерн как базу для примера.
        examples: List[str] = []
        if ic.get("patterns"):
            head = ic["patterns"][0]
            # Грубо превращаем в «покажи <тема>»
            topic = head.split("\\")[0].replace("(?", "").replace(":", "").strip()
            if topic:
                examples.append(f"{topic} …")
        specs.append(
            CommandSpec(
                intent=ic["intent"],
                description=(
                    f"Команды категории «{ic['intent']}»: раздел SBBOL «{ic.get('section') or '?'}»."
                ),
                examples=examples or [ic["intent"]],
                section=ic.get("section"),
            )
        )
    return specs


def _manifest_from_banking_queries() -> List[CommandSpec]:
    """Спецификации из banking/queries.py (платежи по имени, отчёты по номеру, ...)."""
    return [
        CommandSpec(
            intent="payments_by_name",
            description=(
                "Найти платежи / переводы по контрагенту (имя, организация, ИП). "
                "Примеры поддерживаемых фраз: «найди платежи Иванова», «покажи переводы ООО Ромашка», "
                "«все оплаты Петрову». Можно указать валюту (RUB/BYN/USD/EUR) — будет фильтр."
            ),
            examples=[
                "найди платежи Иванова",
                "покажи переводы ООО Ромашка",
                "все оплаты Петрову",
                "найди перевод на 150 рублей",
                "платежи Белнефтехим за март",
            ],
        ),
        CommandSpec(
            intent="report_by_number",
            description=(
                "Найти / открыть отчёт по номеру или по теме. "
                "«покажи отчёт номер 211», «открой отчёт 43», «квартальный отчёт»."
            ),
            examples=[
                "покажи отчёт номер 211",
                "открой отчёт 43",
                "квартальный отчёт",
            ],
        ),
        CommandSpec(
            intent="open_counterparty_card",
            description=(
                "Открыть карточку контрагента / клиента. "
                "«покажи карточку Петрова», «открой карточку поставщика Ромашка»."
            ),
            examples=[
                "покажи карточку клиента Петров",
                "открой карточку ООО Ромашка",
            ],
        ),
        CommandSpec(
            intent="statement_period",
            description=(
                "Сформировать выписку / показать обороты за период. "
                "«выписка за март», «покажи обороты за квартал», «остаток на счёте»."
            ),
            examples=[
                "выписка за март",
                "покажи обороты за квартал",
                "сколько на счёте",
                "остаток на сегодня",
            ],
        ),
        CommandSpec(
            intent="finance_analytics",
            description=(
                "Аналитика по финансам: расходы по категориям, кассовый разрыв, "
                "сравнение месяцев, прогноз. "
                "«расходы за март по категориям», «кассовый разрыв», «сравни январь и февраль»."
            ),
            examples=[
                "расходы за март по категориям",
                "кассовый разрыв",
                "прогноз остатков",
            ],
        ),
        CommandSpec(
            intent="counterparty_risk",
            description=(
                "Проверка контрагента / благонадёжность / due diligence. "
                "«проверь контрагента Ромашка», «надёжен ли ООО Ромашка»."
            ),
            examples=[
                "проверь контрагента ООО Ромашка",
                "благонадёжность поставщика",
            ],
        ),
        CommandSpec(
            intent="notifications_active",
            description=(
                "Активные напоминания / что на подписи / кассовый разрыв. "
                "«что на подпись», «что надо заплатить», «активные напоминания»."
            ),
            examples=[
                "что на подпись",
                "что надо заплатить в этом месяце",
                "покажи напоминания",
            ],
        ),
    ]


def _manifest_from_form_fill() -> List[CommandSpec]:
    """Спецификации заполнения платёжной формы (когда form_type задан)."""
    return [
        CommandSpec(
            intent="form_fill_amount",
            description="Заполнить сумму платежа в форме. «сумма 1500», «на 200 рублей».",
            examples=["сумма 1500", "на 200 рублей", "amount 1000"],
        ),
        CommandSpec(
            intent="form_fill_purpose",
            description="Заполнить назначение платежа. «назначение — оплата аренды», «оплата по счёту 43».",
            examples=["назначение — оплата аренды", "оплата по счёту 43"],
        ),
        CommandSpec(
            intent="form_fill_recipient",
            description="Заполнить получателя / контрагента. «получатель Иванов», «контрагент ООО Ромашка».",
            examples=["получатель Иванов", "контрагент ООО Ромашка"],
        ),
        CommandSpec(
            intent="form_fill_doc_number",
            description="Заполнить номер документа. «номер документа 123», «документ №45».",
            examples=["номер документа 123", "документ №45"],
        ),
        CommandSpec(
            intent="form_fill_doc_date",
            description="Заполнить дату документа. «дата 01.06.2026», «сегодня».",
            examples=["дата 01.06.2026", "дата сегодня"],
        ),
        CommandSpec(
            intent="form_fill_urgency",
            description="Очерёдность платежа (1–6). «очерёдность 3», «очерёдность шестая».",
            examples=["очерёдность 3", "очерёдность шестая"],
        ),
    ]


def _manifest_from_navigation() -> List[CommandSpec]:
    """Спецификации навигации (demo_routes)."""
    return [
        CommandSpec(
            intent="navigate_payments",
            description="Перейти в раздел «Платежи» / «Расчёты». «открой платежи», «раздел расчёты».",
            examples=["открой платежи", "раздел расчёты", "к платежам"],
        ),
        CommandSpec(
            intent="navigate_statement",
            description="Перейти в «Выписку». «открой выписку», «выписка по счёту».",
            examples=["открой выписку", "выписка по счёту"],
        ),
        CommandSpec(
            intent="navigate_salary",
            description="Перейти в «Зарплатный проект». «открой зарплату», «зарплатный проект».",
            examples=["открой зарплату", "зарплатный проект"],
        ),
        CommandSpec(
            intent="navigate_products",
            description="Перейти в «Продукты» (кредит/депозит/карты). «покажи продукты», «кредиты».",
            examples=["покажи продукты", "открой кредиты", "депозиты"],
        ),
        CommandSpec(
            intent="create_payment_doc",
            description="Создать платёжный документ. «создай платёжку», «новое поручение», "
            "«создай платёжное поручение в BYN».",
            examples=[
                "создай платёжку",
                "новое поручение",
                "создай платёжное поручение в BYN",
            ],
        ),
    ]


def build_manifest() -> List[Dict[str, Any]]:
    """Собрать манифест всех поддерживаемых команд в сериализуемый список dict.

    Возвращает list[dict] (а не list[CommandSpec]), чтобы LLM получал сразу JSON-ready
    структуру без dataclass-сериализации.
    """
    specs: List[CommandSpec] = []
    specs.extend(_manifest_from_intents())
    specs.extend(_manifest_from_banking_queries())
    specs.extend(_manifest_from_form_fill())
    specs.extend(_manifest_from_navigation())

    # Сортируем по имени для стабильности (кэш + дебаг).
    specs.sort(key=lambda s: s.intent)

    # Экономим токены для бесплатных моделей OpenRouter:
    #  - examples берутся из regex'ов через _safe_examples и часто получаются
    #    мусорные («корпоративн …», «перевод …») — выкидываем;
    #  - description для INTENTS — шаблонный («Команды категории "cards"…»)
    #    тоже бесполезен — LLM хватит самого имени intent и section.
    compact: List[Dict[str, Any]] = []
    for s in specs:
        item: Dict[str, Any] = {"intent": s.intent}
        if s.section:
            item["section"] = s.section
        # description оставляем только для «человеческих» (banking/form/navigation),
        # где он реально объясняет intent. Для INTENTS-производных он шаблонный —
        # отбрасываем.
        if s.intent not in {sp.intent for sp in _manifest_from_intents()}:
            item["description"] = s.description
        compact.append(item)
    return compact


# ─── LRU-кэш ──────────────────────────────────────────────────────────────────


class _LRU(OrderedDict):
    """Минимальный LRU-кэш по хэшу сообщения → ReformulatedQuery."""

    def __init__(self, maxsize: int):
        super().__init__()
        self._maxsize = max(0, maxsize)

    def get(self, key: str) -> Optional[ReformulatedQuery]:
        if key in self:
            self.move_to_end(key)
            return self[key]
        return None

    def set(self, key: str, value: ReformulatedQuery) -> None:
        if self._maxsize == 0:
            return
        self[key] = value
        self.move_to_end(key)
        while len(self) > self._maxsize:
            self.popitem(last=False)


# ─── Реформатор ──────────────────────────────────────────────────────────────


_SYSTEM_PROMPT_TEMPLATE = """\
Нормализатор запросов ИИ-ассистента СберБизнес (банк для юрлиц в РБ).
Перепиши сообщение пользователя в каноническую фразу для rule-based pipeline.

Команды (кратко): {manifest}

Верни ТОЛЬКО JSON без markdown: {{"canonical": "...", "intent": "..." | null, "params": {{...}}, "confidence": 0.0..1.0}}
- canonical: нормальная фраза на русском, без сленга/ошибок/лишних слов.
- intent: имя команды из списка выше или null.
- params: counterparty, amount, currency, doc_number, period, urgency, recipient, purpose — только то, что явно упомянуто.
- confidence: 0.0 = small talk / приветствие / не команда, 0.6+ = уверенное соответствие.
- НЕ выдумывай параметры. Не добавляй лишних слов в canonical.
"""


class QueryReformulator:
    """Нормализатор пользовательских запросов через LLM + кэш + fallback."""

    def __init__(
        self,
        *,
        enabled: Optional[bool] = None,
        model: Optional[str] = None,
        timeout: Optional[float] = None,
        cache_size: Optional[int] = None,
        min_confidence: float = 0.6,
    ) -> None:
        self._enabled = (
            enabled if enabled is not None else bool(settings.OPENAI_API_KEY)
        )
        self._model = model or getattr(settings, "LLM_REF_MODEL", "") or settings.OPENAI_MODEL
        self._timeout = timeout or float(getattr(settings, "LLM_REF_TIMEOUT", 2.5))
        self._cache_size = cache_size or int(getattr(settings, "LLM_REF_CACHE_SIZE", 256))
        self._min_confidence = min_confidence
        self._manifest: List[Dict[str, Any]] = build_manifest()
        self._cache: _LRU = _LRU(self._cache_size)
        # Локальный rate-limit на случай шторма запросов.
        self._last_call_ts: float = 0.0
        self._min_interval: float = 0.0  # при желании — 0.05s между вызовами

    # ─── публичный API ──────────────────────────────────────────────────────

    def reformulate(self, message: str) -> ReformulatedQuery:
        """Синхронная обёртка (для тестов и простых вызовов).

        В асинхронном контексте используйте areformulate().
        """
        # Тривиальные случаи — сразу short-circuit без LLM и без кэша.
        stripped = (message or "").strip()
        if not stripped:
            return ReformulatedQuery(
                original=message or "",
                canonical=message or "",
                intent=None,
                confidence=0.0,
                params={},
                via_llm=False,
            )

        cache_key = self._cache_key(stripped)
        cached = self._cache.get(cache_key)
        if cached is not None:
            # Возвращаем копию с проставленным original на случай если кэш из старого контекста.
            return ReformulatedQuery(
                original=message,
                canonical=cached.canonical,
                intent=cached.intent,
                confidence=cached.confidence,
                params=dict(cached.params),
                via_llm=False,  # hit = no real LLM call
                elapsed_ms=0,
            )

        if not self._enabled:
            return self._passthrough(message, reason="disabled")

        # Синхронный fallback: если event loop уже запущен, areformulate всё равно работает,
        # а этот метод годится для тестов.
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                # Уже внутри event loop — отдадим original; areformulate() вызовут напрямую.
                return self._passthrough(message, reason="loop-running")
        except RuntimeError:
            pass

        return self._reformulate_sync(stripped, message, cache_key)

    async def areformulate(self, message: str) -> ReformulatedQuery:
        """Асинхронная версия — основная для pipeline."""
        stripped = (message or "").strip()
        if not stripped:
            return ReformulatedQuery(
                original=message or "",
                canonical=message or "",
                intent=None,
                confidence=0.0,
                params={},
                via_llm=False,
            )

        cache_key = self._cache_key(stripped)
        cached = self._cache.get(cache_key)
        if cached is not None:
            return ReformulatedQuery(
                original=message,
                canonical=cached.canonical,
                intent=cached.intent,
                confidence=cached.confidence,
                params=dict(cached.params),
                via_llm=False,
                elapsed_ms=0,
            )

        if not self._enabled:
            return self._passthrough(message, reason="disabled")

        return await self._reformulate_async(stripped, message, cache_key)

    @property
    def manifest(self) -> List[Dict[str, Any]]:
        return list(self._manifest)

    @property
    def cache_info(self) -> Dict[str, int]:
        return {"size": len(self._cache), "max": self._cache_size}

    # ─── внутренние методы ──────────────────────────────────────────────────

    def _cache_key(self, text: str) -> str:
        return hashlib.sha1(text.lower().strip().encode("utf-8")).hexdigest()

    def _passthrough(self, message: str, reason: str) -> ReformulatedQuery:
        logger.debug("Reformulator passthrough (%s): %r", reason, message[:80])
        return ReformulatedQuery(
            original=message,
            canonical=message,
            intent=None,
            confidence=0.0,
            params={},
            via_llm=False,
        )

    def _reformulate_sync(self, stripped: str, original: str, cache_key: str) -> ReformulatedQuery:
        # Для тестов и CLI: вызываем LLM через asyncio.run.
        try:
            return asyncio.run(self._call_llm(stripped, original, cache_key))
        except RuntimeError as exc:
            # Уже запущен event loop — passthrough.
            logger.debug("Reformulator sync fallback (loop): %s", exc)
            return self._passthrough(original, reason="loop-running")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Reformulator sync failed: %s", exc)
            return self._passthrough(original, reason="sync-error")

    async def _reformulate_async(
        self, stripped: str, original: str, cache_key: str
    ) -> ReformulatedQuery:
        try:
            return await asyncio.wait_for(
                self._call_llm(stripped, original, cache_key),
                timeout=self._timeout,
            )
        except asyncio.TimeoutError:
            logger.info("Reformulator timeout for: %r", stripped[:80])
            return self._passthrough(original, reason="timeout")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Reformulator LLM call failed: %s", exc)
            return self._passthrough(original, reason="llm-error")

    async def _call_llm(
        self, stripped: str, original: str, cache_key: str
    ) -> ReformulatedQuery:
        started = time.monotonic()
        # Локальный rate-limit.
        now = time.monotonic()
        if self._min_interval and now - self._last_call_ts < self._min_interval:
            await asyncio.sleep(self._min_interval - (now - self._last_call_ts))
        self._last_call_ts = time.monotonic()

        from openai import AsyncOpenAI

        kwargs: Dict[str, Any] = {"api_key": settings.OPENAI_API_KEY}
        if settings.OPENAI_BASE_URL:
            kwargs["base_url"] = settings.OPENAI_BASE_URL
        headers: Dict[str, str] = {}
        if settings.OPENROUTER_SITE_URL:
            headers["HTTP-Referer"] = settings.OPENROUTER_SITE_URL
        if settings.OPENROUTER_APP_NAME:
            headers["X-Title"] = settings.OPENROUTER_APP_NAME
        if headers:
            kwargs["default_headers"] = headers
        client = AsyncOpenAI(**kwargs)

        system_prompt = _SYSTEM_PROMPT_TEMPLATE.format(manifest=json.dumps(self._manifest, ensure_ascii=False, indent=2))

        resp = await client.chat.completions.create(
            model=self._model,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": stripped},
            ],
            temperature=0,
            max_tokens=300,
        )
        raw = (resp.choices[0].message.content or "").strip()
        elapsed_ms = int((time.monotonic() - started) * 1000)

        parsed = self._parse_llm_json(raw)
        if not parsed:
            return self._passthrough(original, reason="bad-json")

        canonical = str(parsed.get("canonical") or "").strip() or stripped
        intent = parsed.get("intent")
        confidence = self._coerce_float(parsed.get("confidence"), default=0.0)
        params = parsed.get("params") or {}
        if not isinstance(params, dict):
            params = {}

        result = ReformulatedQuery(
            original=original,
            canonical=canonical,
            intent=intent if isinstance(intent, str) else None,
            confidence=confidence,
            params=params,
            via_llm=True,
            elapsed_ms=elapsed_ms,
        )
        self._cache.set(cache_key, result)
        return result

    @staticmethod
    def _coerce_float(value: Any, default: float = 0.0) -> float:
        try:
            v = float(value)
            if v < 0:
                return 0.0
            if v > 1:
                return 1.0
            return v
        except (TypeError, ValueError):
            return default

    @staticmethod
    def _parse_llm_json(raw: str) -> Optional[Dict[str, Any]]:
        """Вытащить JSON из ответа LLM.

        LLM иногда оборачивает в ```json ... ``` или добавляет пояснения. Терпимо к этому.
        """
        if not raw:
            return None
        # Снимем markdown-обёртку, если есть.
        m = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", raw, re.S)
        if m:
            raw = m.group(1)
        # Найдём первую { и последнюю }.
        start = raw.find("{")
        end = raw.rfind("}")
        if start < 0 or end <= start:
            return None
        candidate = raw[start : end + 1]
        try:
            obj = json.loads(candidate)
        except json.JSONDecodeError:
            return None
        if not isinstance(obj, dict):
            return None
        return obj


# ─── Удобный singleton ────────────────────────────────────────────────────────


_default_reformulator: Optional[QueryReformulator] = None


def get_reformulator() -> QueryReformulator:
    """Lazy singleton — переиспользуем manifest и кэш между вызовами."""
    global _default_reformulator
    if _default_reformulator is None:
        _default_reformulator = QueryReformulator()
    return _default_reformulator


def reset_reformulator() -> None:
    """Сброс singleton (для тестов)."""
    global _default_reformulator
    _default_reformulator = None
