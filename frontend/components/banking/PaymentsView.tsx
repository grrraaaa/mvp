"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ASSISTANT_ACTION_EVENT } from "@/lib/assistant/uiBridge";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import {
  CreditCard,
  Coins,
  ShieldCheck,
  Scale,
  ChevronRight,
  PlusCircle,
  X,
  Sparkles,
  Building,
  CheckCircle2,
  CalendarDays,
} from "lucide-react";
import { runBankingAction } from "@/lib/banking/actionRegistry";
import { isPaymentFormAction } from "@/lib/assistant/formFillRunner";
import { useBankingStore } from "@/store/bankingStore";
import { useAssistantStore } from "@/store/assistantStore";

export default function PaymentsView() {
  const accounts = useBankingStore((s) => s.accounts);
  const counterparties = useBankingStore((s) => s.counterparties);
  const createPayment = useBankingStore((s) => s.createPayment);
  const loadAll = useBankingStore((s) => s.loadAll);
  const { openDocumentModal } = useSbbolUi();
  const formActions = useAssistantStore((s) => s.formActions);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Form states - Перевод в BYN
  const [sourceAcc, setSourceAcc] = useState('');
  const [rcptName, setRcptName] = useState('');
  const [rcptIban, setRcptIban] = useState('');
  const [rcptUnp, setRcptUnp] = useState('');
  const [payAmount, setPayAmount] = useState('');
  const [payPurpose, setPayPurpose] = useState('');

  // Form states - Заказ наличных денег
  const [cashAmount, setCashAmount] = useState('');
  const [cashCurr, setCashCurr] = useState<'BYN' | 'USD' | 'EUR'>('BYN');
  const [cashBranch, setCashBranch] = useState('01-Минск (Головной офис)');
  const [cashPhone, setCashPhone] = useState('+375 ');

  // Form states - Покупка/продажа валюты
  const [fxType, setFxType] = useState<'BUY' | 'SELL'>('BUY');
  const [fxCurrency, setFxCurrency] = useState<'USD' | 'EUR'>('USD');
  const [fxAmount, setFxAmount] = useState('1000');

  const bynAccounts = accounts.filter(acc => acc.currency === 'BYN');

  useEffect(() => {
    if (formActions?.some(isPaymentFormAction)) {
      setActiveModal("payout_byn");
    }
  }, [formActions]);

  useEffect(() => {
    const handler = (e: Event) => {
      const { action, value } = (e as CustomEvent<{ action: string; value?: string }>).detail ?? {};
      if (action === "open-payment-byn-modal" || action === "open-doc-modal") {
        if (action === "open-doc-modal") openDocumentModal();
        else setActiveModal("payout_byn");
        return;
      }
      if (!action?.startsWith("fill:") || activeModal !== "payout_byn") return;
      const field = action.slice(5);
      const v = value ?? "";
      if (field === "rcptName") setRcptName(v);
      else if (field === "rcptIban") setRcptIban(v);
      else if (field === "rcptUnp") setRcptUnp(v);
      else if (field === "payAmount") setPayAmount(v);
      else if (field === "payPurpose") setPayPurpose(v);
      else if (field === "sourceAcc") setSourceAcc(v);
    };
    window.addEventListener(ASSISTANT_ACTION_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_ACTION_EVENT, handler);
  }, [activeModal, openDocumentModal]);

  const applyCounterpartyFromDb = (name: string) => {
    const match = counterparties.find((c) => c.name.toLowerCase().includes(name.toLowerCase()));
    if (!match) return;
    setRcptName(match.name);
    if (match.account) setRcptIban(match.account);
    if (match.unp) setRcptUnp(match.unp);
  };

  // Handle Belarus Payment in BYN Submission
  const handleSubmitPayoutByn = (e: FormEvent) => {
    e.preventDefault();
    if (!sourceAcc || !rcptName || !rcptIban || !payAmount) {
      alert('Пожалуйста, заполните обязательные поля.');
      return;
    }

    const value = parseFloat(payAmount);
    if (isNaN(value) || value <= 0) {
      alert('Введите корректное значение суммы платежа.');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === sourceAcc);
    if (selectedAcc && selectedAcc.balance < value) {
      alert('Недостаточно средств на выбранном счете для совершения перевода.');
      return;
    }

    void createPayment({
      type: "Перевод в BYN",
      counterparty: rcptName,
      amount: value,
      currency: "BYN",
      purpose: payPurpose || "Оплата услуг по договору",
    })
      .then(() => {
        setActiveModal(null);
        alert("Платежное поручение создано и сохранено в PostgreSQL. Ожидает подписания на главной.");
      })
      .catch(() => alert("Ошибка создания платежа. Проверьте подключение к API."));

    // Reset fields
    setRcptName('');
    setRcptIban('');
    setRcptUnp('');
    setPayAmount('');
    setPayPurpose('');
  };

  // Handle FX currency order Submission
  const handleSubmitFx = (e: FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fxAmount);
    if (isNaN(amt) || amt <= 0) return;
    void runBankingAction(
      "fx-trade",
      { side: fxType, currency: fxCurrency, amount: amt },
      { reload: loadAll },
    ).then((ok) => {
      if (ok) setActiveModal(null);
    });
  };

  const handleOrderCash = (e: FormEvent) => {
    e.preventDefault();
    void runBankingAction(
      "order-cash",
      { amount: parseFloat(cashAmount) || 0, currency: cashCurr, branch: cashBranch, phone: cashPhone },
      { reload: loadAll },
    ).then((ok) => {
      if (ok) {
        setActiveModal(null);
        setCashAmount("");
      }
    });
  };

  return (
    <div className="space-y-6 font-sans">
      
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Расчеты со Сбер Банком</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
            Платежная инфраструктура, валютный контроль и касса
          </p>
        </div>
        <button
          type="button"
          data-assistant-action="open-doc-modal"
          onClick={() => openDocumentModal()}
          className="bg-[#128e8b] hover:bg-[#107c79] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md shrink-0"
        >
          Создать документ
        </button>
      </div>

      {/* Main Grid mapping Screenshot 4 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Card 1: Платежи и переводы */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <CreditCard className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Платежи и переводы</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Межбанковские платежи и конверсии</span>
              </div>
            </div>

            {/* Links columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Col 1 */}
              <div className="space-y-3">
                <Link
                  href="/payments/paydocbyn"
                  data-assistant-action="open-payment-byn"
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Переводы в BYN</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                </Link>

                <Link
                  href="/payments/instant"
                  data-assistant-action="open-payment-instant"
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Мгновенные платежи</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </Link>

                <Link
                  href="/payments/paydoccur"
                  data-assistant-action="open-payment-cur"
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Переводы в инвалюте</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </Link>

                <button 
                  onClick={() => alert('Проверка акцептов платежных требований в обработке.')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Акцепт платежных требований</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button 
                  onClick={() => alert('Бронирование денежных средств с расчетного счета.')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Бронирование денежных средств</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>

              {/* Col 2 */}
              <div className="space-y-3">
                <button 
                  onClick={() => {
                    const rcpt = prompt('Имя бенефициара за рубежом:', 'Vikas K');
                    if (rcpt) alert(`Подготовка Swift сообщения в иностранной валюте для бенефициара ${rcpt}.`);
                  }}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Переводы в инвалюте</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button 
                  onClick={() => setActiveModal('forex_trade')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Покупка/продажа (конверсия)</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Кассовое обслуживание */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Coins className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Кассовое обслуживание</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Завод, выдача и взнос наличности в кассах</span>
              </div>
            </div>

            {/* Links columns */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Col 1 */}
              <div className="space-y-3">
                <button 
                  onClick={() => alert('Наличные BYN можно забрать с использованием чековой книжки или токена в авторизованной кассе Сбера.')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Получение наличных BYN</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
                
                <button 
                  onClick={() => setActiveModal('order_cash')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Заказ наличных денег</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>

              {/* Col 2 */}
              <div className="space-y-3">
                <button 
                  onClick={() => alert('Заявка на получение наличных в USD / EUR по предварительной брони.')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Получение наличной инвалюты</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button 
                  onClick={() => alert('Заявка на безопасный взнос выручки через инкассацию Сбера.')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Взнос наличной инвалюты</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Валютный контроль и ВЭД */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <ShieldCheck className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Валютный контроль и ВЭД</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Обеспечение норм валютного законодательства</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => alert('Предоставление нормативных документов во исполнение внешнеторгового договора.')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Документы для валютного контроля</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button 
                onClick={() => {
                  const dealNum = prompt('Введите номер внешнеторговой сделки для регистрации:');
                  if (dealNum) alert(`Сделка № ${dealNum} отправлена на аудит валютного контроля.`);
                }}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Регистрация (перерегистрация) сделки</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button 
                onClick={() => alert('Просмотр отчетов по репатриации валютной выручки.')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Сведения о поступивших денежных средствах по валютной операции</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        {/* Card 4: АИС ИДО */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Scale className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">АИС ИДО</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Автоматизированная информационная система исполнения документов</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => alert('Формирование заявки на добровольную оплату неисполненных обязательств.')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Заявления на оплату требований на взыскание средств в бесспорном порядке</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
              
              <button 
                onClick={() => alert('Запрос ведомости неисполненных обязательств. Статус: задолженностей не обнаружено.')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Ведомость неисполненных денежных обязательств в АИС ИДО</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

      </div>

      {/* MODAL: BYN Payments Form creation wizard */}
      {activeModal === 'payout_byn' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg w-full shadow-2xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-1.5 text-[#138d8a]">
                <Sparkles className="w-5 h-5" />
                <h3 className="font-bold text-sm text-[#2c3e50] uppercase tracking-wide">
                  Создание рублевого платежного поручения (BYN)
                </h3>
              </div>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitPayoutByn} className="space-y-3 text-xs">
              
              {/* Account selection */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Списать со счета (BYN) *</label>
                <select 
                  value={sourceAcc}
                  onChange={(e) => setSourceAcc(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 font-semibold bg-white text-gray-750 focus:ring-[#138d8a] focus:border-[#138d8a]"
                  required
                >
                  <option value="">-- Выберите расчетный счет --</option>
                  {bynAccounts.map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.id} ({acc.label}) — Баланс: {acc.balance.toLocaleString()} BYN
                    </option>
                  ))}
                </select>
              </div>

              {/* Recipient Brand Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ФИО или Название получателя *</label>
                <input
                  type="text"
                  list="payments-counterparties"
                  data-assistant-field="rcptName"
                  value={rcptName}
                  onChange={(e) => setRcptName(e.target.value)}
                  onBlur={(e) => applyCounterpartyFromDb(e.target.value)}
                  placeholder="Например, ООО БелТелесистемы"
                  className="w-full border border-gray-300 rounded-lg p-2"
                  required
                />
                <datalist id="payments-counterparties">
                  {counterparties.map((c) => (
                    <option key={c.id} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Recipient IBAN Account */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Счет получателя (IBAN) *</label>
                  <input
                    type="text"
                    data-assistant-field="rcptIban"
                    value={rcptIban}
                    onChange={(e) => setRcptIban(e.target.value)}
                    placeholder="BY70 BPSB 3012 ..."
                    className="w-full border border-gray-300 rounded-lg p-2 uppercase font-mono"
                    maxLength={28}
                    required
                  />
                </div>

                {/* Recipient Tax UNP code */}
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">УНП Получателя</label>
                  <input
                    type="text"
                    data-assistant-field="rcptUnp"
                    value={rcptUnp}
                    onChange={(e) => setRcptUnp(e.target.value)}
                    placeholder="9-значный код"
                    className="w-full border border-gray-300 rounded-lg p-2"
                    maxLength={9}
                  />
                </div>
              </div>

              {/* Sum field */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Сумма к отправке (BYN) *</label>
                <input
                  type="number"
                  data-assistant-field="payAmount"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Сумма в рублях"
                  className="w-full border border-gray-300 rounded-lg p-2 font-black text-gray-900"
                  required
                />
              </div>

              {/* Transfer Purpose */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Назначение платежа</label>
                <textarea
                  data-assistant-field="payPurpose"
                  value={payPurpose}
                  onChange={(e) => setPayPurpose(e.target.value)}
                  placeholder="Оплата за поставку сырья согласно счета № 203 от..."
                  className="w-full border border-gray-300 rounded-lg p-2 h-16 resize-none"
                />
              </div>

              {/* Standard commission advisory */}
              <div className="bg-teal-50 p-2.5 rounded-lg border border-teal-150 text-[10.5px]">
                💡 <strong>Комиссия за перевод:</strong> 0.00 BYN (Пакет услуг «Легкий старт» ОАО «Сбер Банк»). Межбанковский клиринг будет выполнен мгновенно.
              </div>

              <div className="flex gap-2.5 pt-2">
                <button 
                  type="button" 
                  onClick={() => setActiveModal(null)}
                  className="flex-1 py-2.5 font-bold text-gray-550 border rounded-lg hover:bg-slate-50 transition"
                >
                  Отмена
                </button>
                <button 
                  type="submit" 
                  className="flex-1 py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white font-bold rounded-lg transition"
                >
                  Создать и сохранить
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Forex trade order */}
      {activeModal === 'forex_trade' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Дилинговый ордер валют</span>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitFx} className="space-y-4 text-xs font-medium">
              <div>
                <label className="block mb-1 font-bold text-gray-700">Направление сделки</label>
                <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                  <button 
                    type="button" 
                    onClick={() => setFxType('BUY')}
                    className={`flex-1 py-1.5 focus:outline-none ${fxType === 'BUY' ? 'bg-[#138d8a] text-white font-bold' : 'bg-slate-50 text-gray-600'}`}
                  >
                    Покупка (Buy)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setFxType('SELL')}
                    className={`flex-1 py-1.5 focus:outline-none ${fxType === 'SELL' ? 'bg-[#138d8a] text-white font-bold' : 'bg-slate-50 text-gray-600'}`}
                  >
                    Продажа (Sell)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Валютная пара</label>
                  <select 
                    value={fxCurrency} 
                    onChange={(e) => setFxCurrency(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg p-2 font-bold bg-white text-gray-700"
                  >
                    <option value="USD">USD/BYN</option>
                    <option value="EUR">EUR/BYN</option>
                  </select>
                </div>

                <div>
                  <label className="block mb-1 font-bold text-gray-700">Сумма валюты</label>
                  <input 
                    type="number" 
                    value={fxAmount} 
                    onChange={(e) => setFxAmount(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg p-2 font-black text-gray-900"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-gray-150 space-y-1 text-slate-650">
                <div className="flex justify-between">
                  <span>Обменный тариф Сбера:</span> 
                  <strong className="text-gray-800">{fxCurrency === 'USD' ? '3.2500' : '3.5200'}</strong>
                </div>
                <div className="flex justify-between border-t pt-1.5 mt-1 text-gray-900 font-extrabold text-[12px]">
                  <span>Приблизительно в BYN:</span> 
                  <span>{(parseFloat(fxAmount) * (fxCurrency === 'USD' ? 3.25 : 3.52)).toLocaleString()} BYN</span>
                </div>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white font-bold rounded-lg transition"
              >
                Отправить заявку дилерам
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Cash ordering */}
      {activeModal === 'order_cash' && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-sm w-full shadow-2xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Бронирование наличности</span>
              <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleOrderCash} className="space-y-4 text-xs font-medium">
              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block mb-1 font-bold text-gray-700">Требуемая сумма</label>
                  <input 
                    type="number" 
                    value={cashAmount} 
                    onChange={(e) => setCashAmount(e.target.value)}
                    placeholder="Сумма"
                    className="w-full border border-gray-300 rounded-lg p-2 font-black text-gray-900"
                    required
                  />
                </div>
                <div>
                  <label className="block mb-1 font-bold text-gray-700">Валюта</label>
                  <select 
                    value={cashCurr} 
                    onChange={(e) => setCashCurr(e.target.value as any)}
                    className="w-full border border-gray-300 rounded-lg p-2 font-bold bg-white text-gray-700"
                  >
                    <option value="BYN">BYN</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Филиал получения (ОАО «Сбер Банк»)</label>
                <select 
                  value={cashBranch} 
                  onChange={(e) => setCashBranch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 bg-white text-gray-700 font-semibold"
                >
                  <option value="01-Минск (Головной офис)">01-Минск (Головной офис)</option>
                  <option value="04-Брест (Отделение Брест)">04-Брест (Отделение Брест)</option>
                  <option value="05-Гродно (ул. Ожешко)">05-Гродно (ул. Ожешко)</option>
                  <option value="08-Гомель (ул. Советская)">08-Гомель (ул. Советская)</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-bold text-gray-700">Контактный телефон связи *</label>
                <input 
                  type="text" 
                  value={cashPhone} 
                  onChange={(e) => setCashPhone(e.target.value)}
                  placeholder="+375 "
                  className="w-full border border-gray-300 rounded-lg p-2 font-bold"
                  required
                />
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white font-bold rounded-lg transition"
              >
                Подтвердить бронирование
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
