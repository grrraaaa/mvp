"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import {
  CreditCard,
  Coins,
  FolderLock,
  Briefcase,
  Percent,
  Smartphone,
  Globe2,
  X,
  PlusCircle,
  Sparkles,
  Sliders,
  CheckCircle2,
  AlertOctagon,
  ChevronRight,
} from "lucide-react";
import type { BankAccount } from "@/lib/banking/types";
import { runBankingAction } from "@/lib/banking/actionRegistry";
import { useBankingStore } from "@/store/bankingStore";

export default function ProductsView() {
  const accounts = useBankingStore((s) => s.accounts);
  const setAccounts = useBankingStore((s) => s.setAccounts);
  const loadAll = useBankingStore((s) => s.loadAll);
  // Modal controllers
  const [activeTool, setActiveTool] = useState<string | null>(null);

  // Deposit Calculator inputs
  const [depAmount, setDepAmount] = useState(10000);
  const [depTerm, setDepTerm] = useState(12); // months
  const [depCurrency, setDepCurrency] = useState<'BYN' | 'USD' | 'EUR' | 'RUB'>('BYN');
  const [depCap, setDepCap] = useState(true); // capitalized compounds

  // New Account inputs
  const [newAccCurr, setNewAccCurr] = useState<'BYN' | 'USD' | 'EUR' | 'RUB' | 'CNY'>('BYN');
  const [newAccLabel, setNewAccLabel] = useState('');

  // Tariff Pack status
  const [currentTariff, setCurrentTariff] = useState('Легкий старт');

  // Business Card limits state
  const [cardLimit, setCardLimit] = useState('2000');
  const [cardBlocked, setCardBlocked] = useState(false);

  // Math for Deposit interest
  const getInterestRate = () => {
    if (depCurrency === 'BYN') return depTerm >= 12 ? 11.5 : 8.5;
    if (depCurrency === 'USD') return depTerm >= 12 ? 2.5 : 1.25;
    if (depCurrency === 'EUR') return depTerm >= 12 ? 1.8 : 0.95;
    return 6.0; // RUB
  };

  const calculateDepositProfit = () => {
    const rate = getInterestRate() / 100;
    const years = depTerm / 12;
    let total = depAmount;

    if (depCap) {
      // Compounded monthly
      total = depAmount * Math.pow(1 + rate / 12, depTerm);
    } else {
      // Simple interest
      total = depAmount * (1 + rate * years);
    }

    const netProfit = total - depAmount;
    return {
      total: total.toFixed(2),
      profit: netProfit.toFixed(2),
      rate: (rate * 100).toFixed(1)
    };
  };

  const results = calculateDepositProfit();

  // Create an Account
  const handleOpenAccount = (e: FormEvent) => {
    e.preventDefault();
    void runBankingAction(
      "open-account",
      { currency: newAccCurr, label: newAccLabel || "Вновь открытый" },
      { reload: loadAll },
    ).then((ok) => {
      if (ok) {
        setActiveTool(null);
        setNewAccLabel("");
      }
    });
  };

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* Sber section identity wrapper */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Продукты и услуги</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
            Продуктовый портфель корпоративного бизнеса ОАО «Сбер Банк»
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link href="/products/credits" data-assistant-action="open-credits" className="font-bold text-sky-700 hover:underline border border-sky-200 rounded px-3 py-1.5 bg-sky-50">Кредиты</Link>
          <Link href="/products/deposits" data-assistant-action="open-deposits" className="font-bold text-sky-700 hover:underline border border-sky-200 rounded px-3 py-1.5 bg-sky-50">Депозиты</Link>
          <Link href="/products/cards" data-assistant-action="open-cards" className="font-bold text-sky-700 hover:underline border border-sky-200 rounded px-3 py-1.5 bg-sky-50">Карты</Link>
        </div>
      </div>

      {/* Main categories listing matching Screenshot 1 exactly */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Card 1: Корпоративные карты */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <CreditCard className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Корпоративные карты</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Бизнес-карты, лимиты и доверенности</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => alert('Переводы выполняются на вкладке «Деньги и события» со счетов.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Переводы на корпоративные карты</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button onClick={() => alert('Запрос на новую карту Visa / MasterCard Business отправлен в операционный центр ОАО «Сбер Банк» Belarus.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Получение корпоративной карты / бизнес-карты</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button onClick={() => alert('Выписка доверенности на сотрудников для получения пластиковых карт в кассах Сбера.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Доверенность на получение / возврат карт</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button onClick={() => setActiveTool('card_mgmt')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span className="flex items-center gap-1">Управление картами <span className="bg-emerald-550 text-white text-[9px] font-bold px-1 rounded animate-pulse bg-emerald-600">Настройки</span></span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300 animate-bounce" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 2: Депозиты */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Coins className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Депозиты</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Сберегательные программы бизнеса</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => alert('Открытие краткосрочных депозитных счетов в BYN / CNY. Пожалуйста, воспользуйтесь Калькулятором сначала.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Открытие депозита</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button onClick={() => alert('Условия досрочного пополнения депозитного тела.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Пополнение / возврат депозита (процентов)</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button onClick={() => setActiveTool('calculator')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span className="flex items-center gap-1.5 text-teal-800 font-bold bg-teal-50 px-2 py-0.5 rounded border border-teal-150">
                  <Sliders className="w-3 h-3 text-[#138d8a]" />
                  Депозитный калькулятор
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-teal-600 animate-pulse" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 3: Ведение счетов */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <FolderLock className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Ведение счетов</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Регистрация реквизитов и справки</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => setActiveTool('tariff')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span className="font-bold text-sky-700">Смена (подключение) пакета услуг</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button onClick={() => setActiveTool('open_account')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span className="font-bold text-emerald-850 flex items-center gap-1">Открытие счета <span className="bg-sky-50 text-sky-600 border px-1.5 py-0.5 text-[8px] rounded">Online</span></span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button onClick={() => alert('Заказ выписки по счетам юрлица для предоставления инвесторам или аудиторам.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Запрос справки счета</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: Прочие продукты и услуги */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Briefcase className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Прочие продукты</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Самоинкассация и доп услуги</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => alert('Заявка на подключение брокерских или доверительных услуг.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Заявка на предоставление продукта</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button onClick={() => alert('Выдача токенов самоинкассации для вноса наличности в банкоматы Сбера без захода в банк.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Доступ к услуге "Самоинкассация"</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: Кредитование */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Percent className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Кредитование</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Развитие бизнеса, инвестиционные льготы</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => alert('Программа кредитования «Развитие»: субсидируемая ставка Сбера от 7% годовых в BYN. Ваша демо компания предварительно одобрена!')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Кредиты бизнеса</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 6: Эквайринг */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Smartphone className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Эквайринг</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Торговый и мобильный Сбер эквайринг</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => alert('Заказ терминалов в точки продаж компании.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Регистрация пункта обслуживания и терминалов</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button onClick={() => alert('Изменение реквизитов зачисления эквайринга.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Внесение изменений по эквайрингу</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button onClick={() => alert('Таблица активных торговых точек и POS терминалов.')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Пункты обслуживания и терминалы</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 7: Торговая площадка */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Globe2 className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Торговая площадка</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Валютные торги, ценные бумаги и бонды</span>
              </div>
            </div>

            <div className="space-y-3.5 text-xs">
              <button onClick={() => alert('Загрузка интернет дилера Сбер Торги на ПК...')} className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold">
                <span>Вход на торговую площадку (веб-версия)</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL 1: Deposit Calculator (Premium fidelity bonus!) */}
      {activeTool === 'calculator' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg w-full shadow-2xl space-y-5 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-[#138d8a]" />
                <span className="font-extrabold text-sm text-[#2c3e50] uppercase tracking-wide">
                  Депозитный калькулятор ОАО «Сбер Банк»
                </span>
              </div>
              <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form Sliders */}
            <div className="space-y-4 text-xs">
              
              {/* Currency */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Валюта размещения</label>
                <div className="flex gap-2">
                  {['BYN', 'USD', 'EUR', 'RUB'].map(curr => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setDepCurrency(curr as any)}
                      className={`flex-1 py-2 font-bold rounded-lg border text-xs focus:outline-none ${
                        depCurrency === curr 
                          ? 'bg-[#138d8a] text-white border-transparent' 
                          : 'bg-white hover:bg-slate-50 border-gray-200 text-gray-700'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-gray-700">Сумма вклада:</span>
                  <span className="text-sm font-black text-[#138d8a]">
                    {depAmount.toLocaleString()} {depCurrency}
                  </span>
                </div>
                <input 
                  type="range" 
                  min={1000} 
                  max={500000} 
                  step={1000}
                  value={depAmount}
                  onChange={(e) => setDepAmount(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#138d8a]"
                />
              </div>

              {/* Term slider */}
              <div className="space-y-1">
                <div className="flex justify-between items-baseline font-bold">
                  <span className="text-gray-700">Срок размещения:</span>
                  <span className="text-sm font-black text-[#138d8a]">{depTerm} месяцев</span>
                </div>
                <input 
                  type="range" 
                  min={1} 
                  max={36} 
                  step={1}
                  value={depTerm}
                  onChange={(e) => setDepTerm(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#138d8a]"
                />
              </div>

              {/* Capitalization method */}
              <div className="flex items-center justify-between py-2 border-t border-b">
                <span className="font-bold text-gray-700">Ежемесячная капитализация процентов</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={depCap} 
                    onChange={(e) => setDepCap(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:h-5 after:w-5 after:transition-all peer-checked:bg-[#138d8a]" />
                </label>
              </div>

              {/* Calculations results card */}
              <div className="bg-[#f4fbfc] p-4.5 rounded-xl border border-teal-150 grid grid-cols-3 gap-2 text-center text-xs select-text">
                <div>
                  <span className="text-gray-400 block font-semibold mb-0.5">Ставка Сбера</span>
                  <strong className="text-emerald-800 text-lg font-black">{results.rate}%</strong>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold mb-0.5">Ваша прибыль</span>
                  <strong className="text-[#138d8a] text-lg font-black">
                    +{parseFloat(results.profit).toLocaleString()}
                  </strong>
                </div>
                <div>
                  <span className="text-gray-400 block font-semibold mb-0.5">Сумма к концу</span>
                  <strong className="text-gray-900 text-lg font-black">
                    {parseFloat(results.total).toLocaleString()}
                  </strong>
                </div>
              </div>

              <div className="flex gap-2 text-xs font-bold pt-1.5">
                <button 
                  onClick={() => setActiveTool(null)}
                  className="flex-1 py-2 border rounded-lg hover:bg-slate-50 transition"
                >
                  Закрыть
                </button>
                <button 
                  onClick={() => {
                    alert(`Заявка на депозит в объеме ${depAmount.toLocaleString()} ${depCurrency} под ${results.rate}% годовых успешно зарегистрирована ОАО «Сбер Банк» Belarus.`);
                    setActiveTool(null);
                  }}
                  className="flex-1 py-1 px-1 bg-[#128e8b] text-white hover:bg-[#107c79] rounded-lg transition"
                >
                  Оформить онлайн
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Open account online */}
      {activeTool === 'open_account' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Регистрация нового счета</span>
              <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOpenAccount} className="space-y-4 text-xs font-semibold">
              <div>
                <label className="block text-gray-705 mb-1">Никнейм/Заметка счета</label>
                <input 
                  type="text" 
                  value={newAccLabel} 
                  onChange={(e) => setNewAccLabel(e.target.value)}
                  placeholder="для оплаты налогов, крутой счет и др."
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-705 mb-1.5">Валюта расчетного счета</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['BYN', 'USD', 'EUR', 'RUB', 'CNY'].map(curr => (
                    <button
                      key={curr}
                      type="button"
                      onClick={() => setNewAccCurr(curr as any)}
                      className={`px-3 py-1.5 text-xs font-black rounded border transition ${
                        newAccCurr === curr 
                          ? 'bg-[#138d8a] text-white border-transparent' 
                          : 'bg-white hover:bg-slate-50 border-gray-200 text-gray-600'
                      }`}
                    >
                      {curr}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded-lg text-[10px] leading-relaxed border border-emerald-150">
                ✔️ Счёт будет зарегистрирован в платежном реестре немедленно и отобразится во всех финансовых ведомостях компании!
              </div>

              <div className="flex gap-2">
                <button 
                  type="button" 
                  onClick={() => setActiveTool(null)}
                  className="flex-1 py-2 font-bold text-gray-550 border rounded-lg hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-[#128e8b] text-white hover:bg-[#107c79] font-bold rounded-lg transition"
                >
                  Открыть счет
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Tariff comparison change */}
      {activeTool === 'tariff' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-xl w-full shadow-2xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Выбор пакета обслуживания ОАО «Сбер Банк»</span>
              <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs text-gray-600 space-y-3.5 select-text">
              <p>Ваш текущий тариф: <strong className="text-emerald-700">{currentTariff}</strong></p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Pack 1 */}
                <div className="border rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-gray-900">Легкий старт</h4>
                    <span className="text-[10px] text-emerald-600 font-bold">0 BYN / мес</span>
                    <ul className="text-[10px] space-y-1.5 text-gray-500 pt-2 border-t">
                      <li>• 3 исходящих BYN платежа</li>
                      <li>• Безлимит зачислений физикам</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentTariff('Легкий старт'); setActiveTool(null); }}
                    className="w-full mt-3 py-1.5 bg-[#138d8a] text-white rounded font-bold text-[10px] hover:bg-[#0f7270] transition"
                  >
                    Выбрать
                  </button>
                </div>

                {/* Pack 2 */}
                <div className="border border-[#138d8a]/45 rounded-xl p-3.5 space-y-2 flex flex-col justify-between bg-teal-50/20">
                  <div>
                    <div className="flex justify-between items-start">
                      <h4 className="font-black text-gray-950">Активные расчеты</h4>
                      <span className="bg-emerald-600 text-white text-[8px] font-bold px-1.5 rounded uppercase leading-none">Популярный</span>
                    </div>
                    <span className="text-[10px] text-emerald-700 font-bold">35 BYN / мес</span>
                    <ul className="text-[10px] space-y-1.5 text-gray-500 pt-2 border-t">
                      <li>• 30 исходящих BYN платежей</li>
                      <li>• Сниженная валютная комиссия</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentTariff('Активные расчеты'); setActiveTool(null); }}
                    className="w-full mt-3 py-1.5 bg-[#138d8a] text-white rounded font-bold text-[10px] hover:bg-[#0f7270] transition"
                  >
                    Выбрать
                  </button>
                </div>

                {/* Pack 3 */}
                <div className="border rounded-xl p-3.5 space-y-2 flex flex-col justify-between">
                  <div>
                    <h4 className="font-black text-gray-900">Максимальный бизнес</h4>
                    <span className="text-[10px] text-emerald-600 font-bold">120 BYN / мес</span>
                    <ul className="text-[10px] space-y-1.5 text-gray-500 pt-2 border-t">
                      <li>• Полный безлимит BYN операций</li>
                      <li>• Личный VIP банкир 24/7</li>
                    </ul>
                  </div>
                  <button 
                    onClick={() => { setCurrentTariff('Максимальный бизнес'); setActiveTool(null); }}
                    className="w-full mt-3 py-1.5 bg-[#138d8a] text-white rounded font-bold text-[10px] hover:bg-[#0f7270] transition"
                  >
                    Выбрать
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Business card limits adjustment */}
      {activeTool === 'card_mgmt' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Параметры бизнес-карт Сбера</span>
              <button onClick={() => setActiveTool(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-semibold">
              <div className="bg-slate-50 border p-3 rounded-lg flex items-center justify-between">
                <div>
                  <span className="font-black block text-gray-800 text-sm">Visa Business Premium</span>
                  <span className="text-gray-400 text-[10px]">реквизит **** 2293</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${cardBlocked ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {cardBlocked ? 'Заблокирована' : 'Активна'}
                </span>
              </div>

              <div>
                <label className="block mb-1 text-gray-700">Суточный лимит трат (BYN)</label>
                <input 
                  type="number" 
                  value={cardLimit} 
                  onChange={(e) => setCardLimit(e.target.value)}
                  className="w-full border border-gray-300 rounded p-2 text-sm font-black text-gray-900"
                />
              </div>

              <div className="flex gap-2 text-xs font-bold pt-2">
                <button 
                  type="button" 
                  onClick={() => { setCardBlocked(!cardBlocked); }}
                  className={`flex-1 py-2 rounded text-white font-bold transition text-xs ${cardBlocked ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'}`}
                >
                  {cardBlocked ? 'Разблокировать' : 'Заблокировать карту'}
                </button>
                <button 
                  type="button" 
                  onClick={() => { alert(`Лимит трат по карте Visa Business успешно ограничен на уровне ${cardLimit} BYN в сутки.`); setActiveTool(null); }}
                  className="flex-1 py-1.5 px-1.5 bg-[#128e8b] text-white hover:bg-[#107c79] rounded font-bold transition text-xs"
                >
                  Сохранить лимит
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
