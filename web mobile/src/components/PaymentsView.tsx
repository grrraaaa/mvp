import React, { useState } from 'react';
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
  Pause,
  Play
} from 'lucide-react';
import { BankAccount, BankDocument } from '../types';
import { useRole } from '../RoleContext';

interface PaymentsViewProps {
  accounts: BankAccount[];
  setAccounts: React.Dispatch<React.SetStateAction<BankAccount[]>>;
  documents: BankDocument[];
  setDocuments: React.Dispatch<React.SetStateAction<BankDocument[]>>;
}

export default function PaymentsView({
  accounts,
  setAccounts,
  documents,
  setDocuments
}: PaymentsViewProps) {
  const { can, denyTitle } = useRole();
  // Modal states
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

  // Interactive visual autofill state engine
  const [autofillTemplate, setAutofillTemplate] = useState<'none' | 'telecom' | 'rent' | 'tax'>('none');
  const [isAutofilling, setIsAutofilling] = useState(false);
  const [autofillStepIndex, setAutofillStepIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);

  const autofillData = {
    telecom: [
      { field: 'sourceAcc', value: bynAccounts[0]?.id || '' },
      { field: 'rcptName', value: 'ООО БелтелекомСоб' },
      { field: 'rcptIban', value: 'BY33BPSB30121111903420000000' },
      { field: 'rcptUnp', value: '100654812' },
      { field: 'payAmount', value: '340.00' },
      { field: 'payPurpose', value: 'Оплата услуг высокоскоростного интернета и телефонии согласно акту выполненных работ № 104 от 30.04.2026г. Без НДС.' }
    ],
    rent: [
      { field: 'sourceAcc', value: bynAccounts[0]?.id || '' },
      { field: 'rcptName', value: 'ООО ПорталДевелопмент' },
      { field: 'rcptIban', value: 'BY18BPSB30125555432109870000' },
      { field: 'rcptUnp', value: '190284521' },
      { field: 'payAmount', value: '1450.00' },
      { field: 'payPurpose', value: 'Арендная плата за пользование офисными площадями за май 2026 года в соответствии с договором №45-АР от 12.01.2025 года. В том числе НДС.' }
    ],
    tax: [
      { field: 'sourceAcc', value: bynAccounts[0]?.id || '' },
      { field: 'rcptName', value: 'ИМНС РБ по Октябрьскому району г. Минска' },
      { field: 'rcptIban', value: 'BY88AKBB36009000001240000000' },
      { field: 'rcptUnp', value: '101340911' },
      { field: 'payAmount', value: '870.50' },
      { field: 'payPurpose', value: 'Перечисление налога при упрощенной системе налогообложения (УСН) за 1 квартал 2026 года. Без НДС.' }
    ]
  };

  const startAutofill = (type: 'telecom' | 'rent' | 'tax') => {
    setSourceAcc(bynAccounts[0]?.id || 'BY51 BPSB 3012 2222 2222 2933 2222');
    setRcptName('');
    setRcptIban('');
    setRcptUnp('');
    setPayAmount('');
    setPayPurpose('');

    setAutofillTemplate(type);
    setIsAutofilling(true);
    setAutofillStepIndex(1); // steps start at field 'rcptName' (step index 1) since we set account instantly
    setIsPaused(false);
  };

  const cancelAutofill = () => {
    setIsAutofilling(false);
    setAutofillStepIndex(-1);
    setAutofillTemplate('none');
  };

  const completeAutofillInstantly = () => {
    if (autofillTemplate === 'none') return;
    const steps = autofillData[autofillTemplate];
    if (!steps) return;
    
    steps.forEach(step => {
      const setterMap: Record<string, (val: string) => void> = {
        sourceAcc: setSourceAcc,
        rcptName: setRcptName,
        rcptIban: setRcptIban,
        rcptUnp: setRcptUnp,
        payAmount: setPayAmount,
        payPurpose: setPayPurpose,
      };
      
      const setter = setterMap[step.field];
      if (setter) {
        setter(step.value);
      }
    });

    setIsAutofilling(false);
    setAutofillStepIndex(-1);
  };

  React.useEffect(() => {
    if (!isAutofilling || isPaused || autofillStepIndex < 0 || autofillTemplate === 'none') {
      return;
    }

    const steps = autofillData[autofillTemplate];
    if (!steps || autofillStepIndex >= steps.length) {
      setIsAutofilling(false);
      setAutofillStepIndex(-1);
      return;
    }

    const currentStep = steps[autofillStepIndex];
    const targetValue = currentStep.value;

    let idx = 0;
    const setterMap: Record<string, React.Dispatch<React.SetStateAction<string>>> = {
      sourceAcc: setSourceAcc,
      rcptName: setRcptName,
      rcptIban: setRcptIban,
      rcptUnp: setRcptUnp,
      payAmount: setPayAmount,
      payPurpose: setPayPurpose,
    };

    const setter = setterMap[currentStep.field];
    if (!setter) return;

    const interval = setInterval(() => {
      idx++;
      setter(targetValue.slice(0, idx));

      if (idx >= targetValue.length) {
        clearInterval(interval);
        const pauseTimer = setTimeout(() => {
          setAutofillStepIndex(prev => prev + 1);
        }, 550); // small delay between fields
        return () => clearTimeout(pauseTimer);
      }
    }, currentStep.field === 'payPurpose' ? 12 : currentStep.field === 'rcptIban' ? 20 : 35);

    return () => clearInterval(interval);
  }, [isAutofilling, isPaused, autofillStepIndex, autofillTemplate]);

  React.useEffect(() => {
    const handleTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<{ template: 'rent' | 'telecom' | 'tax' }>;
      const { template } = customEvent.detail;
      // 1. Open payout_byn modal
      setActiveModal('payout_byn');
      // 2. Start autofill sequence
      setTimeout(() => {
        startAutofill(template);
      }, 350);
    };

    window.addEventListener('trigger-sber-autofill', handleTrigger);
    return () => window.removeEventListener('trigger-sber-autofill', handleTrigger);
  }, []);

  // Handle Belarus Payment in BYN Submission
  const handleSubmitPayoutByn = (e: React.FormEvent) => {
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

    // Add document
    const newDocId = `№ ${Math.floor(100 + Math.random() * 900)}`;
    const today = new Date();
    const formattedDate = `${String(today.getDate()).padStart(2, '0')}.${String(today.getMonth() + 1).padStart(2, '0')}.${today.getFullYear()}`;
    
    const newDoc: BankDocument = {
      id: newDocId,
      date: formattedDate,
      type: 'Перевод в BYN',
      counterparty: rcptName,
      amount: value,
      currency: 'BYN',
      status: 'На подписи',
      purpose: payPurpose || 'Оплата услуг по договору'
    };

    setDocuments(prev => [newDoc, ...prev]);
    setActiveModal(null);
    alert(`Платежное поручение ${newDocId} создано и ожидает подписания SMS-кодом на главной странице Сбера!`);

    // Reset fields
    setRcptName('');
    setRcptIban('');
    setRcptUnp('');
    setPayAmount('');
    setPayPurpose('');
  };

  // Handle FX currency order Submission
  const handleSubmitFx = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(fxAmount);
    if (isNaN(amt) || amt <= 0) return;

    // Simulate exchange
    alert(`Заявка на ${fxType === 'BUY' ? 'покупку' : 'продажу'} ${amt} ${fxCurrency} успешно зарегистрирована дилером ОАО «Сбер Банк» и отправлена в исполнение.`);
    setActiveModal(null);
  };

  const handleOrderCash = (e: React.FormEvent) => {
    e.preventDefault();
    alert(`Заказ наличных денег на сумму ${cashAmount} ${cashCurr} зарегистрирован в отделении ${cashBranch}. Номер телефона связи: ${cashPhone}.`);
    setActiveModal(null);
    setCashAmount('');
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Upper header title description */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Расчеты со Сбер Банком</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Платежная инфраструктура, валютный контроль и касса
        </p>
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
                <button
                  onClick={() => setActiveModal('payout_byn')}
                  disabled={!can('create_document')}
                  title={can('create_document') ? undefined : denyTitle('create_document')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Переводы в BYN</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => alert('Создано новое платежное требование в BYN')}
                  disabled={!can('create_document')}
                  title={can('create_document') ? undefined : denyTitle('create_document')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Платежные требования в BYN</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => alert('Проверка акцептов платежных требований в обработке.')}
                  disabled={!can('sign_document')}
                  title={can('sign_document') ? undefined : denyTitle('sign_document')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Акцепт платежных требований</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => alert('Бронирование денежных средств с расчетного счета.')}
                  disabled={!can('create_document')}
                  title={can('create_document') ? undefined : denyTitle('create_document')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
                  disabled={!can('create_document')}
                  title={can('create_document') ? undefined : denyTitle('create_document')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Переводы в инвалюте</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => setActiveModal('forex_trade')}
                  disabled={!can('create_document')}
                  title={can('create_document') ? undefined : denyTitle('create_document')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
                  disabled={!can('order_cash')}
                  title={can('order_cash') ? undefined : denyTitle('order_cash')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Получение наличных BYN</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => setActiveModal('order_cash')}
                  disabled={!can('order_cash')}
                  title={can('order_cash') ? undefined : denyTitle('order_cash')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Заказ наличных денег</span>
                  <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>

              {/* Col 2 */}
              <div className="space-y-3">
                <button
                  onClick={() => alert('Заявка на получение наличных в USD / EUR по предварительной брони.')}
                  disabled={!can('order_cash')}
                  title={can('order_cash') ? undefined : denyTitle('order_cash')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Получение наличной инвалюты</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => alert('Заявка на безопасный взнос выручки через инкассацию Сбера.')}
                  disabled={!can('order_cash')}
                  title={can('order_cash') ? undefined : denyTitle('order_cash')}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
                disabled={!can('create_document')}
                title={can('create_document') ? undefined : denyTitle('create_document')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Документы для валютного контроля</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button
                onClick={() => {
                  const dealNum = prompt('Введите номер внешнеторговой сделки для регистрации:');
                  if (dealNum) alert(`Сделка № ${dealNum} отправлена на аудит валютного контроля.`);
                }}
                disabled={!can('create_document')}
                title={can('create_document') ? undefined : denyTitle('create_document')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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
                disabled={!can('create_document')}
                title={can('create_document') ? undefined : denyTitle('create_document')}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none disabled:opacity-40 disabled:cursor-not-allowed"
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

            <form onSubmit={handleSubmitPayoutByn} className="space-y-3.5 text-xs">
              
              {/* Sber Interactive AI Autofill Banner & Templates */}
              <div className="bg-gradient-to-r from-emerald-500/10 via-[#138d8a]/5 to-amber-500/5 border border-emerald-100/50 p-3 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-[10.5px] font-extrabold text-emerald-800 uppercase tracking-widest leading-none">
                      Автозаполнение Александрой
                    </span>
                  </div>
                  {isAutofilling && (
                    <div className="flex items-center gap-1.5">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                      <span className="text-[10px] text-emerald-700 font-extrabold">АКТИВНО</span>
                    </div>
                  )}
                </div>

                {!isAutofilling ? (
                  <div className="space-y-1.5">
                    <p className="text-[10.5px] text-gray-500 font-medium">Выберите готовый шаблон счета, чтобы наглядно увидеть процесс ИИ-заполнения реквизитов:</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => startAutofill('rent')}
                        className="bg-white border border-gray-150 hover:border-emerald-500 hover:bg-emerald-50/10 text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all text-gray-700 cursor-pointer shadow-3xs"
                      >
                        🏢 Аренда офиса (ООО ПорталДевелопмент)
                      </button>
                      <button
                        type="button"
                        onClick={() => startAutofill('telecom')}
                        className="bg-white border border-gray-150 hover:border-emerald-500 hover:bg-emerald-50/10 text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all text-gray-700 cursor-pointer shadow-3xs"
                      >
                        📞 Связь и интернет (ОАО Белтелеком)
                      </button>
                      <button
                        type="button"
                        onClick={() => startAutofill('tax')}
                        className="bg-white border border-gray-150 hover:border-emerald-500 hover:bg-emerald-50/10 text-[10px] px-2.5 py-1 rounded-lg font-bold transition-all text-gray-700 cursor-pointer shadow-3xs"
                      >
                        🏛 Налоги УСН (ИМНС района)
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 bg-white/60 p-2.5 rounded-lg border border-emerald-100/30">
                    <div className="flex items-center justify-between">
                      <span className="text-[10.5px] text-emerald-950 font-black">
                        {autofillTemplate === 'rent' && '🏢 Шаблон: Аренда офиса'}
                        {autofillTemplate === 'telecom' && '📞 Шаблон: Белтелеком'}
                        {autofillTemplate === 'tax' && '🏛 Шаблон: Налоги РБ'}
                      </span>
                      <span className="text-[10px] text-gray-400 font-bold font-mono">
                        Поле {autofillStepIndex} из 5
                      </span>
                    </div>

                    {/* Progress tracking line */}
                    <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-300"
                        style={{ width: `${(autofillStepIndex / 5) * 100}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2.5 pt-1">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setIsPaused(prev => !prev)}
                          className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 px-1.5 py-1 rounded shadow-3xs flex items-center justify-center shrink-0 cursor-pointer focus:outline-none"
                          title={isPaused ? "Продолжить" : "Пауза"}
                        >
                          {isPaused ? <Play className="w-3.5 h-3.5 text-emerald-600 fill-emerald-600" /> : <Pause className="w-3.5 h-3.5" />}
                        </button>
                        <button
                          type="button"
                          onClick={completeAutofillInstantly}
                          className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-250 font-bold text-[10px] px-2 py-1 rounded tracking-wide cursor-pointer focus:outline-none"
                        >
                          ⚡ Заполнить мгновенно
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={cancelAutofill}
                        className="text-red-500 hover:text-red-700 font-extrabold text-[10.5px] cursor-pointer"
                      >
                        ✕ Прервать
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Account selection */}
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Списать со счета (BYN) *</span>
                </label>
                <select 
                  value={sourceAcc}
                  onChange={(e) => setSourceAcc(e.target.value)}
                  className={`w-full border rounded-lg p-2 font-semibold bg-white text-gray-750 focus:ring-[#138d8a] focus:border-[#138d8a] transition-all duration-300 ${isAutofilling && autofillStepIndex === 0 ? 'border-emerald-500 ring-2 ring-emerald-500/30 shadow-[0_0_8px_rgba(16,185,129,0.2)] bg-emerald-50/10' : 'border-gray-300'}`}
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
                <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>ФИО или Название получателя *</span>
                  {isAutofilling && autofillStepIndex === 1 && (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                      ✍ Александра пишет...
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  value={rcptName} 
                  onChange={(e) => setRcptName(e.target.value)}
                  placeholder="Например, ООО БелТелесистемы"
                  className={`w-full border rounded-lg p-2 transition-all duration-300 ${isAutofilling && autofillStepIndex === 1 ? 'border-emerald-500 ring-2 ring-emerald-500/35 bg-emerald-50/10 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold text-gray-900 border-l-4 border-l-emerald-600' : 'border-gray-300'}`}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Recipient IBAN Account */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>Счет получателя (IBAN) *</span>
                    {isAutofilling && autofillStepIndex === 2 && (
                      <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                        ✍ Пишет...
                      </span>
                    )}
                  </label>
                  <input 
                    type="text" 
                    value={rcptIban} 
                    onChange={(e) => setRcptIban(e.target.value)}
                    placeholder="BY70 BPSB 3012 ..."
                    className={`w-full border rounded-lg p-2 uppercase font-mono transition-all duration-300 ${isAutofilling && autofillStepIndex === 2 ? 'border-emerald-500 ring-2 ring-emerald-500/35 bg-emerald-50/10 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold text-gray-900 border-l-4 border-l-emerald-600' : 'border-gray-300'}`}
                    maxLength={28}
                    required
                  />
                </div>

                {/* Recipient Tax UNP code */}
                <div>
                  <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                    <span>УНП Получателя</span>
                    {isAutofilling && autofillStepIndex === 3 && (
                      <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                        ✍ Пишет...
                      </span>
                    )}
                  </label>
                  <input 
                    type="text" 
                    value={rcptUnp} 
                    onChange={(e) => setRcptUnp(e.target.value)}
                    placeholder="9-значный код"
                    className={`w-full border rounded-lg p-2 transition-all duration-300 ${isAutofilling && autofillStepIndex === 3 ? 'border-emerald-500 ring-2 ring-emerald-500/35 bg-emerald-50/10 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold text-gray-900 border-l-4 border-l-emerald-600' : 'border-gray-300'}`}
                    maxLength={9}
                  />
                </div>
              </div>

              {/* Sum field */}
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Сумма к отправке (BYN) *</span>
                  {isAutofilling && autofillStepIndex === 4 && (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                      ✍ Пишет...
                    </span>
                  )}
                </label>
                <input 
                  type="text" 
                  value={payAmount} 
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder="Сумма в рублях"
                  className={`w-full border rounded-lg p-2 font-black transition-all duration-300 ${isAutofilling && autofillStepIndex === 4 ? 'border-emerald-500 ring-2 ring-emerald-500/35 bg-emerald-50/10 shadow-[0_0_10px_rgba(16,185,129,0.25)] text-lg text-emerald-700 border-l-4 border-l-emerald-600' : 'border-gray-300 text-gray-900'}`}
                  required
                />
              </div>

              {/* Transfer Purpose */}
              <div>
                <label className="flex items-center justify-between text-xs font-bold text-gray-700 mb-1">
                  <span>Назначение платежа</span>
                  {isAutofilling && autofillStepIndex === 5 && (
                    <span className="text-[9px] font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 animate-pulse">
                      ✍ Пишет...
                    </span>
                  )}
                </label>
                <textarea 
                  value={payPurpose} 
                  onChange={(e) => setPayPurpose(e.target.value)}
                  placeholder="Оплата за поставку сырья согласно счета № 203 от..."
                  className={`w-full border rounded-lg p-2 h-16 resize-none transition-all duration-300 ${isAutofilling && autofillStepIndex === 5 ? 'border-emerald-500 ring-2 ring-emerald-500/35 bg-emerald-50/10 shadow-[0_0_10px_rgba(16,185,129,0.25)] font-bold text-gray-900 border-l-4 border-l-emerald-600' : 'border-gray-300'}`}
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
                  disabled={!can('sign_document')}
                  title={can('sign_document') ? undefined : `${denyTitle('sign_document')}. Сохранить как черновик можно, но провести платёж — только Руководитель.`}
                  className="flex-1 py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white font-bold rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {can('sign_document') ? 'Создать и сохранить' : 'Подпись доступна только Руководителю'}
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
                disabled={!can('sign_document')}
                title={can('sign_document') ? undefined : denyTitle('sign_document')}
                className="w-full py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white font-bold rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {can('sign_document') ? 'Отправить заявку дилерам' : 'Подпись доступна только Руководителю'}
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
                disabled={!can('order_cash')}
                title={can('order_cash') ? undefined : denyTitle('order_cash')}
                className="w-full py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white font-bold rounded-lg transition disabled:bg-gray-300 disabled:cursor-not-allowed"
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
