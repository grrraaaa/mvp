"""Реестр действий UI по страницам — ассистент может нажимать кнопки и открывать модалки.

Полное покрытие всех страниц демо: каждая кнопка = {target, labels, navigate?, description?}
- target      — data-assistant-action или actionId в actionRegistry
- labels      — варианты фраз пользователя (чем длиннее — тем приоритетнее)
- navigate   — если есть, выполнить router.push() вместо dispatchEvent
- description — краткое описание действия (показываем в ответе)
"""
from __future__ import annotations

import re
from typing import Optional

from models.schemas import ActionButton, AssistantResponse, UiAction
from services.navigation.demo_routes import (
    DEMO_ROUTE_LABELS,
    is_specific_demo_route,
    match_demo_route,
    resolve_navigation_route,
)

# ──────────────────────────────────────────────────────────────────────────────
# PAGE_REGISTRY: route → list of actions
# Каждый entry:
#   target      — строка, которая идёт в dispatchEvent или navigate
#   labels      — фразы пользователя (longest match wins)
#   navigate    — если задан: URL для router.push() вместо click-события
#   description — что ИИ скажет пользователю про эту кнопку
# ──────────────────────────────────────────────────────────────────────────────

PAGE_REGISTRY: dict[str, list[dict]] = {

    "/": [
        {
            "target": "open-payment-instant",
            "labels": ["мгновенный платеж", "мгновенн платеж", "мгновенн", "создай мгновенн", "создать мгновенн"],
            "navigate": "/payments/instant",
            "description": "Мгновенный платёж — перевод на карту другого банка РБ за секунды",
        },
        {
            "target": "open-payment-byn",
            "labels": ["платёжное поручение", "поручение byn", "byn", "создай поручен", "создать поручен", "перевод в byn"],
            "navigate": "/payments/paydocbyn",
            "description": "Платёжное поручение BYN — стандартный перевод в белорусских рублях",
        },
        {
            "target": "open-payment-cur",
            "labels": ["перевод в инвалюте", "валютный перевод", "инвалют", "перевод валют", "paydoccur"],
            "navigate": "/payments/paydoccur",
            "description": "Перевод в инвалюте — SWIFT/без открытия счёта",
        },
        {
            "target": "open-payments",
            "labels": ["расчёты", "платежи", "перейди в расчёты", "все платежи", "список платежей"],
            "navigate": "/payments",
            "description": "Раздел «Расчёты» — все платежи и переводы организации",
        },
        {
            "target": "open-statement",
            "labels": ["выписка", "выписку", "выписки", "движение средств", "операции по счёту"],
            "navigate": "/statement",
            "description": "Выписка — история операций по счетам организации",
        },
        {
            "target": "open-salary",
            "labels": ["зарплат", "ведомост", "зарплатный проект", "зарплату"],
            "navigate": "/salary",
            "description": "Зарплатный проект — выплаты сотрудникам, ведомости, справки",
        },
        {
            "target": "open-products",
            "labels": ["продукт", "кредит", "депозит", "карт", "продукты"],
            "navigate": "/products",
            "description": "Продукты и услуги — кредиты, депозиты, карты, эквайринг",
        },
        {
            "target": "open-services",
            "labels": ["сервис", "вспомогательн", "аналитик"],
            "navigate": "/services",
            "description": "Сервисы — аналитика, курсы валют, проверка контрагентов",
        },
        {
            "target": "create-document",
            "labels": ["создать документ", "новый документ", "создай документ"],
            "description": "Создать новый документ — выбрать тип и начать заполнение",
        },
        {
            "target": "open-other",
            "labels": ["прочее", "в прочем"],
            "navigate": "/other",
            "description": "Прочее — информационные запросы, документы, настройки",
        },
    ],

    # ─── ПЛАТЕЖИ ───────────────────────────────────────────────────────────────

    "/payments": [
        {
            "target": "open-payment-instant",
            "labels": ["мгновенный платеж", "мгновенн", "создай мгновенн", "instant", "срочн"],
            "navigate": "/payments/instant",
            "description": "Мгновенный платёж на карту — перевод за секунды",
        },
        {
            "target": "open-payment-byn",
            "labels": ["платёжное поручение", "поручение byn", "byn", "перевод в byn", "создай поручен", "создать поручен"],
            "navigate": "/payments/paydocbyn",
            "description": "Платёжное поручение BYN — стандартный перевод в белорусских рублях",
        },
        {
            "target": "open-payment-cur",
            "labels": ["перевод в инвалюте", "инвалют", "валютн", "paydoccur", "валюта"],
            "navigate": "/payments/paydoccur",
            "description": "Перевод в инвалюте — SWIFT/без открытия счёта",
        },
        {
            "target": "open-doc-modal",
            "labels": ["создать документ", "тип документа", "новый документ", "создай документ"],
            "description": "Создать документ — выбрать тип: поручение, инвойс, требование…",
        },
        {
            "target": "open-counterparties",
            "labels": ["контрагент", "контрагентов", "справочник контрагентов", "контрагенты"],
            "navigate": "/payments/counterparties",
            "description": "Справочник контрагентов — добавление и проверка партнёров",
        },
    ],

    "/payments/paydocbyn": [
        {
            "target": "fill-form-help",
            "labels": ["помоги заполн", "заполни форм", "заполнить", "заполни"],
            "description": "Помощь в заполнении платёжного поручения — напишите реквизиты в чат",
        },
        {
            "target": "submit-form",
            "labels": ["отправ", "подписать и отправить", "подписать"],
            "description": "Подписать и отправить платёж в банк",
        },
    ],

    "/payments/instant": [
        {
            "target": "fill-form-help",
            "labels": ["помоги заполн", "заполни форм", "заполнить"],
            "description": "Заполнить мгновенный платёж — укажите сумму, получателя и назначение",
        },
    ],

    "/payments/paydoccur": [
        {
            "target": "fill-form-help",
            "labels": ["помоги заполн", "заполни форм", "заполнить"],
            "description": "Заполнить перевод в инвалюте — сумма, валюта, SWIFT-реквизиты",
        },
    ],

    "/payments/counterparties": [
        {
            "target": "add-counterparty",
            "labels": ["добавить контрагента", "добавь контрагент", "новый контрагент"],
            "description": "Добавить нового контрагента в справочник",
        },
        {
            "target": "check-counterparty",
            "labels": ["проверить контрагента", "проверь контрагент", "благонадёжност"],
            "description": "Проверить контрагента по базам данных",
        },
    ],

    # ─── ВЫПИСКА ───────────────────────────────────────────────────────────────

    "/statement": [
        {
            "target": "open-statement-account",
            "labels": ["выписка по счёту", "счёт", "по счетам", "по счёту"],
            "navigate": "/statement/account",
            "description": "Выписка по счёту — операции за период по конкретному счёту",
        },
        {
            "target": "open-statement-cert",
            "labels": ["справк", "справка по счёту", "справки"],
            "navigate": "/statement/certificates",
            "description": "Справки об остатках и оборотах — для банков, налоговой, контрагентов",
        },
        {
            "target": "generate-statement",
            "labels": ["сформировать выписку", "сформируй выписку", "покажи выписку", "показать выписку"],
            "description": "Сформировать выписку за выбранный период — показать операции",
        },
    ],

    "/statement/account": [
        {
            "target": "generate-statement",
            "labels": ["сформировать выписку", "сформируй", "обновить", "показать операции"],
            "description": "Сформировать / обновить выписку за период",
        },
        {
            "target": "statement-today",
            "labels": ["за сегодня", "сегодня", "today"],
            "description": "Выписка за сегодня",
        },
        {
            "target": "statement-month",
            "labels": ["за месяц", "месяц", "за отчётный месяц"],
            "description": "Выписка за текущий отчётный месяц",
        },
        {
            "target": "statement-quarter",
            "labels": ["за квартал", "квартал"],
            "description": "Выписка за квартал",
        },
        {
            "target": "statement-period",
            "labels": ["за год", "год"],
            "description": "Выписка за год",
        },
        {
            "target": "download-statement",
            "labels": ["скачать", "pdf", "выгрузить"],
            "description": "Скачать выписку в PDF",
        },
        {
            "target": "print-statement",
            "labels": ["печать", "распечатать", "принт"],
            "description": "Распечатать выписку",
        },
        {
            "target": "reset-filters",
            "labels": ["сбросить фильтры", "сброс фильтр", "очистить фильтры"],
            "description": "Сбросить все фильтры выписки",
        },
    ],

    "/statement/certificates": [
        {
            "target": "create-certificate",
            "labels": ["создать справку", "заказать справку", "получить справку"],
            "description": "Заказать справку об остатках / оборотах",
        },
        {
            "target": "download-certificate",
            "labels": ["скачать справку", "pdf справк"],
            "description": "Скачать справку в PDF",
        },
    ],

    # ─── ЗАРПЛАТА ────────────────────────────────────────────────────────────

    "/salary": [
        {
            "target": "open-salary-project",
            "labels": ["зарплатный проект", "проект", "зарплатн"],
            "navigate": "/salary/project",
            "description": "Переводы на счета физлиц — зарплатные выплаты",
        },
        {
            "target": "open-employees",
            "labels": ["сотрудник", "реестр", "список сотрудников", "списки"],
            "navigate": "/salary/employees",
            "description": "Списки физлиц на выплату — добавление и управление сотрудниками",
        },
        {
            "target": "open-salary-obligations",
            "labels": ["обязательств", "обязательства", "налоговый календарь", "налог"],
            "navigate": "/salary/obligations",
            "description": "Обязательства — налоги, ФСЗН, взносы",
        },
        {
            "target": "run-payroll",
            "labels": ["выплат", "оплатить зарплат", "провести ведомост", "запусти выплату", "выплатить"],
            "description": "Провести зарплатную выплату — списать и перевести сотрудникам",
        },
        {
            "target": "open-statement",
            "labels": ["выписка", "выписку"],
            "navigate": "/statement/account",
            "description": "Выписка по счетам организации",
        },
    ],

    "/salary/project": [
        {
            "target": "run-payroll",
            "labels": ["выплат", "провести ведомост", "запусти выплату", "выплатить зарплат"],
            "description": "Провести зарплатную выплату — массовый перевод на карты физлиц",
        },
        {
            "target": "open-employees",
            "labels": ["сотрудник", "список", "реестр"],
            "navigate": "/salary/employees",
            "description": "Управление списком сотрудников",
        },
    ],

    "/salary/employees": [
        {
            "target": "add-employee",
            "labels": ["добавить сотрудника", "добавь сотрудника", "новый сотрудник", "добавить физлицо"],
            "description": "Добавить сотрудника в зарплатный список — ФИО, карта, сумма",
        },
        {
            "target": "run-payroll",
            "labels": ["выплат", "провести ведомост", "выплатить"],
            "description": "Провести зарплатную выплату по всему списку",
        },
    ],

    "/salary/obligations": [
        {
            "target": "tax-calendar",
            "labels": ["налоговый календарь", "срок налог", "календарь обязательств"],
            "description": "Календарь налоговых обязательств — НДС, подоходный, ФСЗН",
        },
        {
            "target": "fszh-certificate",
            "labels": ["справка фсзн", "фсзн", "взнос фсзн", "расчёт фсзн"],
            "description": "Рассчитать и оформить взносы в ФСЗН",
        },
        {
            "target": "tax-certificate",
            "labels": ["справка налог", "подоходный налог", "ндс"],
            "description": "Оформить справку об исполнении налоговых обязательств",
        },
    ],

    "/salary/pension": [
        {
            "target": "pension-calculate",
            "labels": ["пенсионн", "отчислен", "расчёт пенси"],
            "description": "Расчёт и отчисления в пенсионный фонд",
        },
    ],

    # ─── ПРОДУКТЫ ──────────────────────────────────────────────────────────

    "/products": [
        {
            "target": "open-corpo-card-transfers",
            "labels": ["перевод на корпоративн", "переводы на корпоративн", "пополнение карточного", "корпоративн карт"],
            "navigate": "/products/corpo-card-transfers",
            "description": "Переводы на корпоративные карты — пополнение бизнес-карт",
        },
        {
            "target": "open-credits",
            "labels": ["кредит", "кредиты", "овердрафт", "кредитн"],
            "navigate": "/products/credits",
            "description": "Кредиты для бизнеса — овердрафт, инвестиционный, кредитная линия",
        },
        {
            "target": "open-deposits",
            "labels": ["депозит", "вклад", "разместить средств"],
            "navigate": "/products/deposits",
            "description": "Депозиты — сберегательные программы для бизнеса",
        },
        {
            "target": "open-cards",
            "labels": ["управление карт", "корпоративн карт", "бизнес-карт"],
            "navigate": "/products/cards",
            "description": "Управление корпоративными картами — лимиты, блокировка",
        },
        {
            "target": "open-card-order",
            "labels": ["получение карт", "бизнес-карт", "выпуск карт"],
            "navigate": "/products/card-order",
            "description": "Заказать выпуск бизнес-карты",
        },
        {
            "target": "open-deposit-open",
            "labels": ["открытие депозит", "открыть депозит", "разместить депозит"],
            "navigate": "/products/deposit-open",
            "description": "Открыть депозит — выбрать сумму, срок и валюту",
        },
        {
            "target": "open-self-collection",
            "labels": ["самоинкассац"],
            "navigate": "/products/self-collection",
            "description": "Подключить самоинкассацию — сдача выручки на счёт",
        },
        {
            "target": "open-marketplace",
            "labels": ["торговая площадка"],
            "navigate": "/products/marketplace",
            "description": "Торговая площадка — валютные торги, ценные бумаги",
        },
        {
            "target": "deposit-calculator",
            "labels": ["депозитный калькулятор", "калькулятор", "рассчитать депозит", "прибыль депозит"],
            "description": "Депозитный калькулятор — рассчитать доходность",
        },
        {
            "target": "open-account",
            "labels": ["открыть счёт", "открытие счёта", "новый счёт", "создать счёт"],
            "description": "Открыть новый расчётный счёт в нужной валюте",
        },
        {
            "target": "change-tariff",
            "labels": ["тариф", "сменить тариф", "пакет услуг", "подключить пакет"],
            "description": "Сменить или подключить пакет услуг — «Легкий старт», «Активные расчёты», «Максимум»",
        },
    ],

    "/products/credits": [
        {
            "target": "request-credit",
            "labels": ["оформить кредит", "заявка на кредит", "кредит для бизнеса", "получить кредит"],
            "description": "Оформить заявку на кредит — овердрафт или инвестиционный",
        },
        {
            "target": "check-overdraft",
            "labels": ["овердрафт", "овердрафт доступ"],
            "description": "Проверить доступный овердрафт по счёту",
        },
    ],

    "/products/deposits": [
        {
            "target": "open-deposit-open",
            "labels": ["открыть депозит", "разместить депозит", "открытие депозит"],
            "navigate": "/products/deposit-open",
            "description": "Открыть депозит — выбрать сумму, срок, валюту, ставку",
        },
        {
            "target": "deposit-refill",
            "labels": ["пополнить депозит", "довложение", "возврат депозит", "досрочно"],
            "description": "Пополнить или частично изъять депозит",
        },
        {
            "target": "deposit-calculator",
            "labels": ["калькулятор", "рассчитать доход", "прибыль"],
            "description": "Депозитный калькулятор — рассчитать доходность",
        },
    ],

    "/products/cards": [
        {
            "target": "card-limits",
            "labels": ["лимит", "установить лимит", "суточный лимит", "лимит карт"],
            "description": "Установить или изменить суточный лимит по бизнес-карте",
        },
        {
            "target": "card-block",
            "labels": ["заблокировать карту", "блокировка", "заблокировать"],
            "description": "Заблокировать бизнес-карту",
        },
        {
            "target": "card-unblock",
            "labels": ["разблокировать карту", "разблокировать"],
            "description": "Разблокировать бизнес-карту",
        },
        {
            "target": "open-card-order",
            "labels": ["выпустить карту", "новую карту", "заказать карту"],
            "navigate": "/products/card-order",
            "description": "Заказать выпуск новой бизнес-карты",
        },
    ],

    "/products/corpo-card-transfers": [
        {
            "target": "create-corpo-transfer",
            "labels": ["создать перевод", "перевод на карту", "создать документ", "новый перевод"],
            "description": "Создать перевод на корпоративную карту",
        },
        {
            "target": "import-corpo-transfer",
            "labels": ["импорт", "импортировать"],
            "description": "Импортировать реестр переводов из файла",
        },
    ],

    "/products/ved": [
        {
            "target": "ved-document",
            "labels": ["вэд", "документ вэд", "валютн контрол"],
            "description": "Документы валютного контроля — справки, контракты",
        },
    ],

    "/products/marketplace": [
        {
            "target": "marketplace-trade",
            "labels": ["торговля", "валютные торги", "ценные бумаги", "бонд"],
            "description": "Торговая площадка — валютные торги, облигации",
        },
    ],

    # ─── СЕРВИСЫ ──────────────────────────────────────────────────────────────

    "/services": [
        {
            "target": "open-onec",
            "labels": ["1с", "onec", "импорт из 1с", "синхрониз"],
            "navigate": "/services/onec",
            "description": "Интеграция с 1С — выгрузка и загрузка документов",
        },
        {
            "target": "open-counterparty-check",
            "labels": ["проверка контрагента", "благонадёжност", "риск контрагент"],
            "navigate": "/services/counterparty",
            "description": "Проверка контрагента — благонадёжность, Due Diligence",
        },
        {
            "target": "open-exchange-rates",
            "labels": ["курс", "курсы валют", "обмен валют", "котировк"],
            "navigate": "/services/exchange-rates",
            "description": "Курсы валют — текущие и архивные котировки",
        },
        {
            "target": "open-analytics",
            "labels": ["аналитик", "анализ", "финансы", "кассовый разрыв"],
            "navigate": "/services/analytics",
            "description": "Бизнес-аналитика — кассовые разрывы, прогнозы, обороты",
        },
    ],

    "/services/onec": [
        {
            "target": "import-onec",
            "labels": ["импорт", "загрузить из 1с", "выгрузить в 1с", "синхрониз"],
            "description": "Импортировать или выгрузить документы из 1С",
        },
    ],

    "/services/counterparty": [
        {
            "target": "check-counterparty",
            "labels": ["проверить контрагента", "проверь", "благонадёжност", "риск"],
            "description": "Проверить контрагента — риск-анализ, DUE DILIGENCE",
        },
        {
            "target": "add-counterparty",
            "labels": ["добавить контрагента", "добавь", "новый контрагент"],
            "description": "Добавить контрагента в справочник",
        },
    ],

    "/services/exchange-rates": [
        {
            "target": "fx-trade",
            "labels": ["купить валюту", "продать валюту", "конверсия", "обмен валют", "swap"],
            "description": "Конверсия валют — покупка/продажа по текущему курсу",
        },
        {
            "target": "exchange-history",
            "labels": ["история курсов", "архив курсов", "динамика курсов"],
            "description": "Архив курсов валют за период",
        },
    ],

    "/services/analytics": [
        {
            "target": "cash-gap",
            "labels": ["кассовый разрыв", "прогноз остатка", "денежный поток"],
            "description": "Прогноз кассового разрыва — когда и на сколько не хватит средств",
        },
        {
            "target": "monthly-expenses",
            "labels": ["расход по категориям", "категории расходов", "структура расходов"],
            "description": "Структура расходов по категориям за месяц",
        },
        {
            "target": "compare-months",
            "labels": ["сравнить месяцы", "динамика", "сравнение месяцев"],
            "description": "Сравнить обороты за разные месяцы",
        },
    ],

    # ─── ПРОЧЕЕ ─────────────────────────────────────────────────────────────

    "/other": [
        {
            "target": "open-info-requests",
            "labels": ["запрос выписк", "запрос информац", "выписк информац", "информационный запрос"],
            "navigate": "/other/info-requests",
            "description": "Запросы выписки, информации — остатки, ведомости, справки",
        },
        {
            "target": "open-documents",
            "labels": ["документ", "документы", "журнал документов", "на подписи"],
            "navigate": "/other/documents",
            "description": "Журнал документов — все платежи, на подписи, черновики",
        },
    ],

    "/other/info-requests": [
        {
            "target": "create-info-request",
            "labels": ["создать документ", "новый запрос", "создать запрос", "запрос остаток", "запрос выписк"],
            "description": "Создать информационный запрос — остаток, ведомость, справка",
        },
        {
            "target": "open-statement",
            "labels": ["выписка", "открыть выписку"],
            "navigate": "/statement/account",
            "description": "Открыть выписку за период",
        },
    ],

    "/other/documents": [
        {
            "target": "create-document",
            "labels": ["создать документ", "новый документ"],
            "description": "Создать новый документ — выбрать тип и заполнить",
        },
        {
            "target": "open-info-requests",
            "labels": ["информационные запросы", "запросы"],
            "navigate": "/other/info-requests",
            "description": "Информационные запросы — остатки, ведомости, справки",
        },
        {
            "target": "filter-signed",
            "labels": ["на подписи", "подписанные", "черновики", "исполненные"],
            "description": "Фильтр документов по статусу",
        },
        {
            "target": "filter-year",
            "labels": ["за год", "за этот год", "документы за год", "за 2026"],
            "description": "Фильтр документов за год",
        },
        {
            "target": "filter-month",
            "labels": ["за месяц", "за этот месяц", "за март", "за февраль", "за апрель"],
            "description": "Фильтр документов за месяц",
        },
        {
            "target": "filter-range",
            "labels": ["за период", "между датами", "с даты по дату", "за квартал"],
            "description": "Фильтр документов за произвольный период",
        },
        {
            "target": "reset-filters",
            "labels": ["сбросить фильтры", "показать все", "все документы"],
            "description": "Сбросить все фильтры и показать весь журнал",
        },
    ],

    "/other/documents/view": [
        {
            "target": "repeat-document",
            "labels": ["повторить", "создать аналог", "копировать"],
            "description": "Создать документ на основании этого — аналогичный платёж",
        },
        {
            "target": "sign-document",
            "labels": ["подписать", "отправить"],
            "description": "Подписать документ и отправить в банк",
        },
        {
            "target": "open-statement",
            "labels": ["выписка", "открыть выписку", "период"],
            "navigate": "/statement/account",
            "description": "Открыть выписку за период к этому документу",
        },
    ],

    # ─── НАСТРОЙКИ ──────────────────────────────────────────────────────────

    "/settings": [
        {
            "target": "open-settings-security",
            "labels": ["безопасност", "эцп", "электронная подпись", "токен", "настройки безопасности"],
            "navigate": "/settings/security",
            "description": "Безопасность — ЭЦП, токены, ограничение доступа",
        },
        {
            "target": "logout",
            "labels": ["выйти", "выход", "завершить сеанс"],
            "description": "Выйти из демо-кабинета",
        },
    ],

    "/settings/security": [
        {
            "target": "setup-ecp",
            "labels": ["эцп", "электронная подпись", "установить подпись"],
            "description": "Настроить ЭЦП для подписания документов",
        },
        {
            "target": "token-management",
            "labels": ["токен", "ключ", "управление токенами"],
            "description": "Управление API-токенами и доступом",
        },
    ],

    # ─── ЛОГИН ───────────────────────────────────────────────────────────────

    "/login": [
        {
            "target": "demo-login",
            "labels": ["войти", "вход", "авторизац", "демо", "demo"],
            "description": "Войти под демо-пользователем (demo / ipivanov / buhplus)",
        },
        {
            "target": "forgot-password",
            "labels": ["забыл пароль", "восстановить", "не помню пароль"],
            "description": "Восстановить доступ к кабинету",
        },
    ],
}


# ──────────────────────────────────────────────────────────────────────────────
# Глобальные команды (любая страница)
# ──────────────────────────────────────────────────────────────────────────────

GLOBAL_ACTIONS: list[dict] = [
    {
        "target": "open-chat",
        "labels": ["открой чат", "помощник", "консультант", "алексей"],
        "description": "Открыть панель AI-консультанта",
    },
    {
        "target": "open-doc-modal",
        "labels": ["создать документ", "новый документ", "создай документ"],
        "description": "Создать новый документ — выбрать тип",
    },
    {
        "target": "open-home",
        "labels": ["на главную", "главная", "домой", "home"],
        "navigate": "/",
        "description": "Перейти на главную страницу",
    },
    {
        "target": "open-payments",
        "labels": ["расчёты", "платежи"],
        "navigate": "/payments",
        "description": "Раздел «Расчёты»",
    },
    {
        "target": "open-statement",
        "labels": ["выписка", "выписку"],
        "navigate": "/statement/account",
        "description": "Выписка по счёту",
    },
    {
        "target": "open-salary",
        "labels": ["зарплат"],
        "navigate": "/salary",
        "description": "Зарплатный проект",
    },
    {
        "target": "open-products",
        "labels": ["продукт", "кредит", "депозит"],
        "navigate": "/products",
        "description": "Продукты и услуги",
    },
    {
        "target": "open-learning",
        "labels": ["обучени", "обучающий модуль", "пройти обучение", "как пользоваться банком"],
        "navigate": "/learning",
        "description": "Обучающий модуль — интерактивный курс по СберБизнес",
    },
]


# ──────────────────────────────────────────────────────────────────────────────
# Команды «нажми на кнопку» — срабатывают на любой странице
# ──────────────────────────────────────────────────────────────────────────────

CLICK_PATTERNS = [
    r"нажми\b",
    r"нажать\b",
    r"открой\b",
    r"открыть\b",
    r"открыва\b",
    r"перейди\b",
    r"перейти\b",
    r"покажи\b",
    r"показать\b",
    r"запусти\b",
    r"создай\b",
    r"создать\b",
    r"оформи\b",
    r"оформить\b",
    r"импорт",
    r"синхрониз",
    r"подключ",
    r"выплат",
    r"заполни\b",
    r"заполнить\b",
    r"помоги\b",
    r"рассчитай\b",
    r"рассчитать\b",
    r"проверь\b",
    r"проверить\b",
    r"добавь\b",
    r"добавить\b",
    r"скачай\b",
    r"скачать\b",
    r"распечатай\b",
    r"распечатать\b",
    r"войди\b",
    r"войти\b",
    r"войди\b",
]


# ──────────────────────────────────────────────────────────────────────────────
# Детальные описания действий (для ИИ-подсказок)
# ──────────────────────────────────────────────────────────────────────────────

ACTION_DESCRIPTIONS: dict[str, str] = {
    "create-document": "Создаёт новый документ выбранного типа (поручение, инвойс, платёж)",
    "open-payment-instant": "Открывает мгновенный платёж — перевод на карту за секунды",
    "open-payment-byn": "Открывает платёжное поручение BYN",
    "open-payment-cur": "Открывает перевод в инвалюте",
    "open-doc-modal": "Показывает модальное окно выбора типа документа",
    "generate-statement": "Формирует выписку за выбранный период по счетам",
    "run-payroll": "Запускает массовую зарплатную выплату сотрудникам",
    "add-employee": "Добавляет сотрудника в зарплатный список",
    "add-counterparty": "Добавляет контрагента в справочник",
    "check-counterparty": "Проверяет контрагента — благонадёжность и DUE DILIGENCE",
    "open-onec": "Открывает интеграцию с 1С",
    "import-onec": "Импортирует документы из 1С или выгружает в неё",
    "fx-trade": "Покупка или продажа валюты по текущему курсу",
    "cash-gap": "Показывает прогноз кассового разрыва — когда и сколько не хватит",
    "monthly-expenses": "Структура расходов по категориям за месяц",
    "compare-months": "Сравнение оборотов за два месяца",
    "tax-calendar": "Календарь налоговых обязательств — сроки уплаты НДС, подоходного, ФСЗН",
    "fszh-certificate": "Оформляет справку об отсутствии задолженности перед ФСЗН",
    "tax-certificate": "Оформляет справку об исполнении налоговых обязательств",
    "open-deposit-open": "Открывает форму открытия депозита",
    "deposit-refill": "Пополняет или частично изымает депозит",
    "deposit-calculator": "Депозитный калькулятор — рассчитать доходность",
    "card-limits": "Устанавливает суточный лимит по бизнес-карте",
    "card-block": "Блокирует бизнес-карту",
    "card-unblock": "Разблокирует бизнес-карту",
    "change-tariff": "Сменить или подключить пакет услуг",
    "open-account": "Открыть новый расчётный счёт",
    "sign-document": "Подписать документ ЭЦП и отправить в банк",
    "repeat-document": "Создать копию документа",
    "create-info-request": "Создать информационный запрос — остаток, ведомость, справку",
    "logout": "Выйти из кабинета",
    "setup-ecp": "Настроить электронную цифровую подпись",
}


# ──────────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────────

def _normalize_route(page_route: Optional[str]) -> str:
    if not page_route:
        return "/"
    # /other/documents/view?doc=... → /other/documents/view
    base = page_route.split("?")[0].rstrip("/")
    return base or "/"


def _match_action(message: str, page_route: Optional[str]) -> Optional[dict]:
    """Найти действие по фразе пользователя.

    Логика выбора:
    1) Точный маршрут навигации → сразу navigate.
    2) Из кандидатов текущей страницы + глобальных — выбираем самый длинный матч по label.
    3) Если среди кандидатов есть ``filter-year/filter-month/filter-range`` И в сообщении
       явно указан год / месяц / период, даём приоритет конкретному фильтру над
       общим ``reset-filters`` (иначе «покажи все документы за 2026 год» ошибочно
       шлёт ``reset-filters``, потому что «все документы» длиннее «за 2026»).
    """
    msg = message.lower().strip()

    if not any(re.search(p, msg) for p in CLICK_PATTERNS):
        return None

    # 1) Точный маршрут навигации (мгновенный платёж → /payments/instant)
    nav_route = resolve_navigation_route(message)
    if nav_route and is_specific_demo_route(nav_route):
        return {
            "target": f"nav-{nav_route}",
            "labels": [nav_route],
            "navigate": nav_route,
            "description": f"Перейти в раздел «{DEMO_ROUTE_LABELS.get(nav_route, nav_route)}»",
        }

    # 2) Искать в PAGE_REGISTRY текущей страницы + глобальные
    route = _normalize_route(page_route)
    candidates = PAGE_REGISTRY.get(route, []) + GLOBAL_ACTIONS

    # Признаки того, что в сообщении есть конкретный период — тогда year/month/range
    # должен выиграть у reset-filters.
    year_signal = bool(
        re.search(r"20\d{2}|этот\s+год|прошл\w*\s+год|прошл\w*\s+месяц|январ|феврал|март|апрел|ма[йя]|июн|июл|август|сентябр|октябр|ноябр|декабр|квартал", msg)
    )
    range_signal = bool(
        re.search(r"\d{1,2}[./]\d{1,2}|\bс\s+\d|\bпо\s+\d|за\s+период|между|диапазон|с\s+даты\s+по\s+дату", msg)
    )

    # Соберём ВСЕ матчи и затем выберем лучший с учётом приоритета фильтров.
    matches: list[tuple[dict, int]] = []  # (item, label_length)
    for item in candidates:
        for label in item.get("labels", []):
            if label in msg:
                matches.append((item, len(label)))

    if matches:
        def _score(item_len: tuple[dict, int]) -> tuple[int, int]:
            item, length = item_len
            target = item.get("target", "")
            # year/month/range — специфичные фильтры документов
            if target in {"filter-year", "filter-month", "filter-range"}:
                if year_signal or range_signal:
                    return (2, length)  # приоритет 2
                return (1, length)
            if target == "reset-filters":
                # reset — общий, его понижаем, если есть конкретный период
                if year_signal or range_signal:
                    return (0, length)
                return (1, length)
            return (1, length)

        matches.sort(key=_score, reverse=True)
        return matches[0][0]

    # 3) Fallback: ключевые слова без маршрута
    if re.search(r"создать документ|новый документ", msg):
        return {"target": "open-doc-modal", "labels": ["документ"], "description": "Создать новый документ"}
    if re.search(r"мгновенн|instant|срочн\w*\s+платеж", msg):
        return {"target": "open-payment-instant", "labels": ["мгновенн"], "navigate": "/payments/instant", "description": "Мгновенный платёж"}
    if re.search(r"инвалют|валютн\w*\s+перевод|paydoccur", msg):
        return {"target": "open-payment-cur", "labels": ["инвалют"], "navigate": "/payments/paydoccur", "description": "Перевод в инвалюте"}
    if re.search(r"платежн\w*\s+поручен|поручени\w*\s+byn|paydocby", msg):
        return {"target": "open-payment-byn", "labels": ["поручен"], "navigate": "/payments/paydocbyn", "description": "Платёжное поручение BYN"}
    if re.search(r"выписк", msg) and route in ("/", "/payments"):
        return {"target": "open-statement", "labels": ["выписка"], "navigate": "/statement/account", "description": "Выписка по счёту"}
    if re.search(r"зарплат", msg):
        return {"target": "open-salary", "labels": ["зарплат"], "navigate": "/salary", "description": "Зарплатный проект"}

    return None


# ──────────────────────────────────────────────────────────────────────────────
# Публичный API
# ──────────────────────────────────────────────────────────────────────────────

def handle_page_ui_action(
    message: str,
    session_id: str,
    page_route: Optional[str] = None,
) -> Optional[AssistantResponse]:
    """Выполнить UI-действие на текущей странице (клик, навигация, модалка)."""
    matched = _match_action(message, page_route)
    if not matched:
        return None

    target = matched["target"]
    navigate = matched.get("navigate")
    description = matched.get("description", "")
    ui_actions: list[UiAction] = []

    # Навигация
    if navigate:
        # Если идём на /other/documents и в сообщении есть год/период —
        # добавим query-параметры, чтобы сразу открыть с фильтром.
        if navigate == "/other/documents" or navigate.startswith("/other/documents?"):
            period = _extract_documents_query(message)
            if period:
                base = "/other/documents"
                if "?" in navigate:
                    # /other/documents?status=... — дополняем фильтры
                    base, _, existing = navigate.partition("?")
                    qs = existing + "&" + period
                else:
                    qs = period
                navigate = f"{base}?{qs}"
        ui_actions.append(UiAction(type="navigate", target=navigate))
        label = DEMO_ROUTE_LABELS.get(navigate, navigate)
        if description:
            msg_text = f"{description}. Открываю."
        else:
            msg_text = f"Открываю «{label}»."
        return AssistantResponse(
            message=msg_text,
            session_id=session_id,
            ui_actions=ui_actions,
            action_buttons=[ActionButton(label=f"Перейти: {label}", url=navigate, variant="primary")],
        )

    # Кнопки формы
    if target == "fill-form-help":
        return AssistantResponse(
            message="Напишите реквизиты: сумму, получателя, назначение — заполню форму на этой странице.",
            session_id=session_id,
            action_buttons=[
                ActionButton(label="Сумма 1500, аренда", message="Сумма 1500, назначение аренда офиса", variant="primary"),
            ],
        )

    # Клик по action target
    click_value: Optional[str] = None
    if target in {"filter-year", "filter-month", "filter-range"}:
        click_value = _extract_filter_value(target, message)
        if target == "filter-year" and not click_value:
            click_value = _infer_default_year(message)
    if click_value:
        ui_actions.append(UiAction(type="click", target=target, value=click_value))
    else:
        ui_actions.append(UiAction(type="click", target=target))
    desc = ACTION_DESCRIPTIONS.get(target, description or f"Выполняю: {target}")
    return AssistantResponse(
        message=f"{desc}…",
        session_id=session_id,
        ui_actions=ui_actions,
    )


def _extract_filter_value(target: str, message: str) -> Optional[str]:
    """Извлечь значение фильтра (год / YYYY-MM / dd.mm.yyyy|dd.mm.yyyy) из текста."""
    low = message.lower()
    if target == "filter-year":
        m = re.search(r"(20\d{2})", low)
        if m:
            return m.group(1)
        return None
    if target == "filter-month":
        # формат YYYY-MM (фронт ожидает это)
        m = re.search(
            r"за\s+(январ[ья]?|феврал[ья]?|март[а]?|апрел[ья]?|ма[йя]|мая|"
            r"июн[ья]?|июл[ья]?|август[а]?|сентябр[ья]?|октябр[ья]?|ноябр[ья]?|декабр[ья]?)"
            r"(?:\s+(20\d{2}))?",
            low,
        )
        if not m:
            return None
        month_stem = m.group(1)
        year = m.group(2) or _infer_default_year(message) or "2026"
        month_map = {
            "январ": 1, "феврал": 2, "март": 3, "апрел": 4, "май": 5, "мая": 5,
            "июн": 6, "июл": 7, "август": 8, "сентябр": 9, "октябр": 10, "ноябр": 11, "декабр": 12,
        }
        for stem, num in month_map.items():
            if month_stem.startswith(stem[:4]) or month_stem.startswith(stem):
                return f"{year}-{num:02d}"
        return None
    if target == "filter-range":
        m = re.search(
            r"(?:с|от)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)"
            r"\s*(?:по|до)\s*(\d{1,2}[./]\d{1,2}(?:[./]\d{2,4})?)",
            low,
        )
        if m:
            return f"{_normalize_date(m.group(1))}|{_normalize_date(m.group(2))}"
        return None
    return None


def _normalize_date(token: str) -> str:
    t = token.replace("/", ".").strip()
    parts = t.split(".")
    if len(parts) == 2:
        return f"{parts[0].zfill(2)}.{parts[1].zfill(2)}.2026"
    if len(parts) == 3:
        d, m, y = parts
        if len(y) == 2:
            y = f"20{y}"
        return f"{d.zfill(2)}.{m.zfill(2)}.{y}"
    return token


def _infer_default_year(message: str) -> Optional[str]:
    """Эвристика: если год явно не указан, берём текущий (2026) — для демо."""
    return "2026"


def _extract_documents_query(message: str) -> Optional[str]:
    """Построить query string для /other/documents из текста (year / month / date_from / date_to).

    Используем ТОЛЬКО если в сообщении есть явный период — иначе пусть URL остаётся
    без параметров (т.е. сбрасывает фильтры).
    """
    try:
        from services.banking.queries import _parse_doc_period_from_text
    except Exception:
        return None
    period = _parse_doc_period_from_text(message)
    if not any(period.get(k) for k in ("year", "month", "date_from", "date_to")):
        return None
    from urllib.parse import quote
    parts: list[str] = []
    if period.get("year"):
        parts.append(f"year={period['year']}")
    if period.get("month"):
        parts.append(f"month={period['month']}")
    if period.get("date_from"):
        parts.append(f"date_from={quote(period['date_from'])}")
    if period.get("date_to"):
        parts.append(f"date_to={quote(period['date_to'])}")
    return "&".join(parts) if parts else None


def get_page_help(page_route: Optional[str]) -> str:
    """Краткая подсказка что ассистент может на странице."""
    route = _normalize_route(page_route)
    hints = PAGE_REGISTRY.get(route, [])
    if not hints:
        return (
            "Могу перейти в любой раздел, создать документ, "
            "найти платёж, заполнить форму, рассчитать депозит, "
            "проверить контрагента и многое другое — просто спросите."
        )
    # Берём описания, не labels
    descs = [h.get("description", h["labels"][0]) for h in hints[:5]]
    return f"Здесь могу: {', '.join(descs)}."


def get_page_quick_actions(page_route: Optional[str]) -> list[ActionButton]:
    """Quick-action кнопки для нижней панели чата."""
    route = _normalize_route(page_route)
    buttons: list[ActionButton] = []
    for item in PAGE_REGISTRY.get(route, [])[:6]:
        label = item.get("description", item["labels"][0])
        if item.get("navigate"):
            buttons.append(ActionButton(label=label[:40], url=item["navigate"], variant="secondary"))
        else:
            buttons.append(ActionButton(label=label[:40], message=item["labels"][0], variant="secondary"))
    return buttons


def get_all_actions_for_llm(page_route: Optional[str]) -> str:
    """Все действия на странице одной строкой — для system prompt."""
    route = _normalize_route(page_route)
    hints = PAGE_REGISTRY.get(route, [])
    if not hints:
        return ""
    lines = []
    for h in hints:
        desc = h.get("description", h["labels"][0])
        labels = " | ".join(f'«{l}»' for l in h["labels"][:3])
        url = f" → {h['navigate']}" if h.get("navigate") else ""
        lines.append(f"- {desc} (триггеры: {labels}){url}")
    return "\n".join(lines)
