"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Settings,
  MoreVertical,
  FileSpreadsheet,
  Check,
  ChevronRight,
  TrendingUp,
  Search,
  FileCheck2,
  Percent,
  CreditCard,
  Building2,
  Users2,
  ArrowRightLeft,
} from "lucide-react";
import type { BankDocument } from "@/lib/banking/types";
import { useBankingStore } from "@/store/bankingStore";
import { useAuthStore } from "@/store/authStore";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";

export default function MoneyView() {
  const router = useRouter();
  const orgName = useAuthStore((s) => s.user?.org_name) ?? "DEMO ЮРИДИЧЕСКОЕ ЛИЦО";
  const accounts = useBankingStore((s) => s.accounts);
  const setAccounts = useBankingStore((s) => s.setAccounts);
  const documents = useBankingStore((s) => s.documents);
  const signDocument = useBankingStore((s) => s.signDocument);
  const loadAll = useBankingStore((s) => s.loadAll);
  const { openDocumentModal } = useSbbolUi();
  const onCreateDocument = () => openDocumentModal();
  const onOpenQuickAction = (actionId: string) => {
    if (actionId === "loans" || actionId === "corp-cards") {
      router.push("/products");
      setTimeout(
        () =>
          alert(
            actionId === "loans"
              ? "Информация по Кредитам ОАО «Сбер Банк» представлена в подразделе Кредитование!"
              : "Вы переведены в Консоль корпоративных карт!",
          ),
        300,
      );
    } else if (actionId === "employees") {
      router.push("/salary");
    }
  };
  const [promoOpen, setPromoOpen] = useState(true);
  const [showAllFunds, setShowAllFunds] = useState(true);
  const [filterCurrency, setFilterCurrency] = useState<'all' | 'BYN' | 'USD' | 'EUR' | 'RUB'>('all');
  const [showHiddenAccounts, setShowHiddenAccounts] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Collapsible panels state
  const [dynamicsOpen, setDynamicsOpen] = useState(true);
  const [movementOpen, setMovementOpen] = useState(true);
  
  // Search state inside account chooser
  const [showFilterDropdown, setShowFilterDropdown] = useState(false);
  const [noteEditId, setNoteEditId] = useState<string | null>(null);
  const [noteEditText, setNoteEditText] = useState('');

  // Sber SMS signature demo state
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [selectedDocToSign, setSelectedDocToSign] = useState<BankDocument | null>(null);
  const [smsCode, setSmsCode] = useState('');
  const [smsSent, setSmsSent] = useState(false);
  const [signProgress, setSignProgress] = useState(false);

  // Counterparty Verification state
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [unpInput, setUnpInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<any | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  // Quick Currency calculator state
  const [calcAmount, setCalcAmount] = useState('100');
  const [fromCurr, setFromCurr] = useState<'BYN' | 'USD' | 'EUR' | 'RUB'>('USD');
  const [toCurr, setToCurr] = useState<'BYN' | 'USD' | 'EUR' | 'RUB'>('BYN');
  const rates = {
    BYN: 1,
    USD: 3.25,
    EUR: 3.52,
    RUB: 0.035
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    void loadAll().finally(() => setIsRefreshing(false));
  };

  // Convert funds mathematically
  const sumByn = accounts
    .filter(acc => acc.currency === 'BYN' && (!acc.hidden || showHiddenAccounts))
    .reduce((sum, acc) => sum + acc.balance, 0);

  const foreignBalances = {
    USD: accounts.filter(acc => acc.currency === 'USD' && (!acc.hidden || showHiddenAccounts)).reduce((sum, acc) => sum + acc.balance, 0),
    RUB: accounts.filter(acc => acc.currency === 'RUB' && (!acc.hidden || showHiddenAccounts)).reduce((sum, acc) => sum + acc.balance, 0),
    EUR: accounts.filter(acc => acc.currency === 'EUR' && (!acc.hidden || showHiddenAccounts)).reduce((sum, acc) => sum + acc.balance, 0),
  };

  const handleEditNote = (accId: string, currentLabel: string) => {
    setNoteEditId(accId);
    setNoteEditText(currentLabel);
  };

  const handleSaveNote = (accId: string) => {
    setAccounts(prev => prev.map(acc => acc.id === accId ? { ...acc, label: noteEditText } : acc));
    setNoteEditId(null);
  };

  const handleToggleHide = (accId: string) => {
    setAccounts(prev => prev.map(acc => acc.id === accId ? { ...acc, hidden: !acc.hidden } : acc));
  };

  // Filter accounts
  const filteredAccounts = accounts.filter(acc => {
    if (acc.hidden && !showHiddenAccounts) return false;
    if (filterCurrency === 'all') return true;
    return acc.currency === filterCurrency;
  });

  // Currency Converter calculation
  const convertCurrency = () => {
    const amt = parseFloat(calcAmount) || 0;
    const valueInByn = amt * rates[fromCurr];
    const targetValue = valueInByn / rates[toCurr];
    return targetValue.toFixed(2);
  };

  // Safe signature action
  const startSign = (doc: BankDocument) => {
    setSelectedDocToSign(doc);
    setSignatureModalOpen(true);
    setSmsSent(false);
    setSmsCode('');
  };

  const sendSmsNotification = () => {
    setSmsSent(true);
    alert('Имитация SMS: Одноразовый код подписи выслан на ваш номер мобильного телефона!');
  };

  const submitSignature = () => {
    if (!smsCode || !selectedDocToSign) return;
    setSignProgress(true);
    setTimeout(() => {
      void signDocument(selectedDocToSign.id)
        .then(() => {
          setSignProgress(false);
          setSignatureModalOpen(false);
          setSelectedDocToSign(null);
        })
        .catch(() => {
          setSignProgress(false);
          alert("Ошибка подписания. Проверьте API.");
        });
    }, 1500);
  };

  // Sber Belarus UNP checking service simulator
  const handleVerifyTaxId = (e: FormEvent) => {
    e.preventDefault();
    if (!unpInput) return;
    setVerifyLoading(true);
    setTimeout(() => {
      // Real database check simulator
      const code = parseInt(unpInput);
      if (isNaN(code)) {
        setVerifyResult({
          valid: false,
          message: 'Некорректный формат УНП. УНП должен состоять из цифр.'
        });
      } else if (code < 100000000 || code > 999999999) {
        setVerifyResult({
          valid: false,
          message: 'УНП Республики Беларусь должен содержать ровно 9 значащих цифр.'
        });
      } else {
        const brands = [
          'ООО «Инновационные Решения»', 'ЗАО «БелВнешПром»', 'ЧТУП «ГлобалЛогистик»',
          'ОДО «Партнер-Бел»', 'ИП Григорьев А.Н.', 'УП «Силикон Текнолоджис»'
        ];
        const names = brands[code % brands.length];
        const scoringList = ['Высокий уровень надежности', 'Умеренный риск (Рекомендуется дополнительный контроль)', 'Благонадежный контрагент'];
        const scoring = scoringList[code % scoringList.length];
        const sanctions = code % 5 === 0 ? 'Присутствуют признаки ликвидации или судебных споров!' : 'Действующий субъект хозяйства, санкционных ограничений не обнаружено.';
        setVerifyResult({
          valid: true,
          unp: unpInput,
          name: names,
          scoring: scoring,
          status: code % 5 === 0 ? 'ВНИМАНИЕ' : 'АКТИВЕН',
          sanctions: sanctions,
        });
      }
      setVerifyLoading(false);
    }, 1000);
  };

  return (
    <div className="flex flex-col gap-6 font-sans">
      
      {/* Top corporate promo container (Screenshot 5 banner) */}
      {promoOpen && (
        <div className="relative rounded-2xl bg-gradient-to-r from-[#e7f4f4] via-[#f1fcfc] to-[#e7f5f4] border border-teal-100 p-6 md:p-8 flex flex-col md:flex-row justify-between items-center gap-6 overflow-hidden shadow-sm">
          {/* Close Banner button */}
          <button 
            onClick={() => setPromoOpen(false)}
            className="absolute top-4 right-4 p-1 hover:bg-teal-500/10 rounded-full text-gray-500 hover:text-gray-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="max-w-xl space-y-4">
            <h2 className="text-3xl font-extrabold text-[#0c3c32] tracking-tight leading-tight">
              Больше стран для проверки контрагента
            </h2>
            <p className="text-sm text-emerald-800 font-medium">
              Сервис проверки бизнеса включен в пакеты услуг. Контролируйте надежность зарубежных партнеров прямо в личном кабинете.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                onClick={() => {
                  setUnpInput('190123456');
                  setVerifyModalOpen(true);
                }}
                className="bg-[#128e8b] hover:bg-[#107c79] text-white px-5 py-2.5 rounded-lg text-xs font-bold transition-all shadow-sm active:scale-95"
              >
                Создать запрос
              </button>
              <button 
                onClick={() => {
                  alert('Предоставлена подробная информация: сервис СФЕРУМ/Проверка Контрагентов поддерживает моментальный комплаенс-анализ в КНР, РФ, Казахстане, ОАЭ и 15 других юрисдикциях.');
                }}
                className="bg-white hover:bg-gray-55 text-[#138d8a] border border-[#138d8a]/30 px-5 py-2.5 rounded-lg text-xs font-bold transition-all hover:border-[#138d8a]"
              >
                Подробнее
              </button>
            </div>
          </div>

          {/* Graphical design representation matching the male character with laptop */}
          <div className="relative h-32 w-52 overflow-hidden hidden md:flex items-center justify-center shrink-0">
            {/* Interactive Sber styling laptop / secure checking badge */}
            <div className="absolute right-0 bottom-0 w-28 h-28 bg-[#138d8a]/10 rounded-full animate-pulse flex items-center justify-center">
              <Building2 className="w-12 h-12 text-[#138d8a]/50" />
            </div>
            <div className="absolute left-4 top-2 bg-white px-3 py-1.5 rounded-lg shadow-md border border-teal-50/50 flex items-center gap-1.5 animate-bounce">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-bold text-gray-700">Комплаенс OK</span>
            </div>
            {/* Modern computer outline */}
            <svg className="w-full h-full text-[#138d8a]" fill="none" viewBox="0 0 100 100">
              <rect x="25" y="40" width="50" height="32" rx="4" fill="#eefaf9" stroke="currentColor" strokeWidth="2" />
              <rect x="21" y="70" width="58" height="6" rx="2" fill="currentColor" />
              <line x1="30" y1="50" x2="70" y2="50" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 3"/>
              <circle cx="50" cy="54" r="6" stroke="currentColor" strokeWidth="2" fill="white" />
              <path d="M47 54 L50 57 L55 51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}

      {/* Main Layout containing Sber bank lists & Side widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT COLUMN: Main accounts overview, Dynamics & Document listings */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight font-display flex items-center gap-2">
                {orgName}
              </h1>
              <p className="text-xs text-gray-400 font-semibold uppercase mt-0.5 tracking-wider">
                Кабинет управления расчетно-кассовым обслуживанием
              </p>
            </div>
            <button
              type="button"
              data-assistant-action="create-document"
              onClick={onCreateDocument}
              className="bg-[#128e8b] hover:bg-[#107c79] text-white px-6 py-3 rounded-lg text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center gap-2 shrink-0 self-stretch sm:self-auto justify-center"
            >
              <span>Создать документ</span>
            </button>
          </div>

          {/* SubSection 1: "Всего доступно средств" widget (Screenshot 5) */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
            <button 
              onClick={() => setShowAllFunds(prev => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[#138d8a]" />
                <span className="font-extrabold text-[#2c3e50] text-sm uppercase tracking-wider">
                  Всего доступно средств
                </span>
                <span className="text-xs text-[#138d8a] font-medium bg-teal-50 px-2 py-0.5 rounded-full border border-teal-100">
                  Активно
                </span>
              </div>
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4.5 h-4.5 text-gray-300 hover:text-gray-500 transition-colors" onClick={(e) => { e.stopPropagation(); alert('Агрегированная сводка средств со всех ваших открытых текущих лицевых счетов в BYN и иностранных валютах в соответствии с курсом ОАО «Сбер Банк».'); }} />
                {showAllFunds ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {showAllFunds && (
              <div className="p-6 bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fadeIn">
                {/* BYN Balance Card */}
                <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">На счетах в BYN</span>
                  <div className="text-xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
                    {sumByn.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    <span className="text-xs font-semibold text-gray-450">BYN</span>
                  </div>
                </div>

                {/* USD Balance Card */}
                <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Баланс в USD</span>
                  <div className="text-xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
                    {foreignBalances.USD.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    <span className="text-xs font-semibold text-gray-450">USD</span>
                  </div>
                </div>

                {/* RUB Balance Card */}
                <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Баланс в RUB</span>
                  <div className="text-xl font-black text-gray-900 mt-1 flex items-baseline gap-1">
                    {foreignBalances.RUB.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    <span className="text-xs font-semibold text-gray-450">RUB</span>
                  </div>
                </div>

                {/* EUR Balance Card */}
                <div className="bg-white p-4.5 rounded-xl border border-gray-150 shadow-xs">
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Баланс в EUR</span>
                  <div className="text-xl font-black text-gray-950 mt-1 flex items-baseline gap-1">
                    {foreignBalances.EUR.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                    <span className="text-xs font-semibold text-gray-450">EUR</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SubSection 2: "Счета" section with table list (Screenshot 5) */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
            <div className="px-5 py-4.5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-[#138d8a]" />
                <h3 className="font-extrabold text-[#2c3e50] text-sm uppercase tracking-wider">Счета</h3>
              </div>

              {/* Filtering Controls Row */}
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium w-full sm:w-auto">
                {/* Custom Sber Dropdown Selector "Все валюты • Все счета" */}
                <div className="relative">
                  <button 
                    onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                    className="flex items-center gap-2 px-3 py-1.5 border border-gray-200 rounded-lg hover:border-gray-400 bg-white transition-all text-gray-700"
                  >
                    <span>{filterCurrency === 'all' ? 'Все валюты • Все счета' : `Фильтр: ${filterCurrency}`}</span>
                    <ChevronDown className="w-3 px-0 h-3 text-gray-400" />
                  </button>
                  {showFilterDropdown && (
                    <div className="absolute right-0 mt-1.5 bg-white border border-gray-200 rounded-lg shadow-lg py-1.5 w-52 z-30 font-sans">
                      <button onClick={() => { setFilterCurrency('all'); setShowFilterDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <span>Все валюты</span>
                        {filterCurrency === 'all' && <Check className="w-3.5 h-3.5 text-[#138d8a]" />}
                      </button>
                      {['BYN', 'USD', 'EUR', 'RUB'].map((curr) => (
                        <button key={curr} onClick={() => { setFilterCurrency(curr as any); setShowFilterDropdown(false); }} className="w-full text-left px-4 py-2 hover:bg-slate-50 transition-colors flex items-center justify-between">
                          <span>{curr} счета</span>
                          {filterCurrency === curr && <Check className="w-3.5 h-3.5 text-[#138d8a]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex items-center gap-2 text-gray-600 hover:text-gray-900 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={showHiddenAccounts} 
                    onChange={(e) => setShowHiddenAccounts(e.target.checked)}
                    className="rounded border-gray-300 text-[#138d8a] focus:ring-[#138d8a] h-4 w-4"
                  />
                  <span>Отображать скрытые</span>
                </label>

                {/* Reload Link */}
                <button 
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="flex items-center gap-1.5 text-[#138d8a] hover:text-[#0f7270] transition-colors border-l pl-4 border-gray-200 disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>Обновить остатки</span>
                </button>

                <button className="p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-slate-50">
                  <Settings className="w-4 h-4" onClick={() => alert('Настройка видимости счетов: здесь вы можете скрыть незадействованные валютные счета из главной сводки.')} />
                </button>
              </div>
            </div>

            {/* List of accounts matching card look inside Screenshot 5 */}
            <div className="divide-y divide-gray-100">
              {filteredAccounts.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  Нет расчетных счетов, соответствующих фильтру.
                </div>
              ) : (
                filteredAccounts.map((account) => (
                  <div 
                    key={account.id} 
                    className={`flex flex-col sm:flex-row sm:items-center justify-between p-5 hover:bg-slate-50/60 transition-colors gap-4 ${
                      account.hidden ? 'opacity-55 bg-gray-50/50' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Currency badge circular icon */}
                      <div className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center bg-gray-50 font-bold text-[#138d8a] text-xs shrink-0 select-none">
                        {account.currency}
                      </div>

                      <div className="space-y-1 select-text">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-extrabold text-sm text-[#2a3846] leading-none">
                            {account.id}
                          </span>
                          {account.label && (
                            <span className="bg-sky-50 text-sky-600 border border-sky-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              {account.label}
                            </span>
                          )}
                          {account.hidden && (
                            <span className="bg-amber-50 text-amber-600 border border-amber-100 text-[10px] px-2 py-0.5 rounded-full font-bold">
                              скрыт
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1.5 md:gap-3 flex-wrap">
                          <span className="text-[11px] text-gray-400 font-semibold uppercase">
                            {account.type}
                          </span>
                          <span className="text-gray-300 hidden sm:inline">•</span>
                          {noteEditId === account.id ? (
                            <div className="flex items-center gap-1">
                              <input 
                                type="text" 
                                value={noteEditText} 
                                onChange={(e) => setNoteEditText(e.target.value)}
                                className="border border-gray-300 rounded px-1.5 py-0.5 text-xs focus:ring-[#138d8a] focus:border-[#138d8a]"
                                size={12}
                              />
                              <button onClick={() => handleSaveNote(account.id)} className="text-emerald-600 text-xs hover:underline font-bold">ОК</button>
                            </div>
                          ) : (
                            <button 
                              onClick={() => handleEditNote(account.id, account.label)}
                              className="text-xs text-sky-600 hover:underline cursor-pointer"
                            >
                              Изменить заметку
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right action controls */}
                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0 border-t sm:border-transparent pt-3 sm:pt-0">
                      <div className="text-right flex flex-col sm:items-end">
                        <span className="text-lg font-black text-gray-900 leading-tight">
                          {account.balance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })}
                        </span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                          Доступные средства ({account.currency})
                        </span>
                      </div>

                      {/* Dropdown Options menu */}
                      <div className="relative group">
                        <button className="p-1.5 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-full transition-colors select-none">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        <div className="absolute right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-md py-1 w-36 hidden group-hover:block hover:block z-25">
                          <button 
                            onClick={() => handleToggleHide(account.id)}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs text-gray-700 transition"
                          >
                            {account.hidden ? 'Отображать' : 'Скрыть счет'}
                          </button>
                          <button 
                            onClick={() => {
                              const amt = parseFloat(prompt('Введите сумму пополнения (симуляция):', '1000') || '0');
                              if (amt > 0) {
                                setAccounts(prev => prev.map(a => a.id === account.id ? { ...a, balance: a.balance + amt } : a));
                              }
                            }}
                            className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs text-gray-700 transition"
                          >
                            Пополнить счет
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* SubSection 3: "Динамика оборотов по счетам, BYN" Collapsible Panel (Screenshot 5) */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
            <button 
              onClick={() => setDynamicsOpen(prev => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-3.5">
                {/* SVG icon layout mimicking bar charts */}
                <div className="w-5 h-5 text-[#138d8a] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4.5 h-4.5">
                    <line x1="18" y1="20" x2="18" y2="10" strokeLinecap="round" />
                    <line x1="12" y1="20" x2="12" y2="4" strokeLinecap="round" />
                    <line x1="6" y1="20" x2="6" y2="14" strokeLinecap="round" />
                  </svg>
                </div>
                <span className="font-extrabold text-[#2c3e50] text-sm uppercase tracking-wider">
                  Динамика оборотов по счетам, BYN
                </span>
                <HelpCircle className="w-4 h-4 text-gray-300" onClick={(e) => { e.stopPropagation(); alert('График отражает движение денежных средств по всем вашим текущим счетам в BYN за последние 6 месяцев работы.'); }} />
              </div>
              {dynamicsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
            </button>

            {dynamicsOpen && (
              <div className="p-6 bg-white animate-fadeIn">
                {/* High fidelity inline SVG bar chart with responsive grid design */}
                <div className="w-full">
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-6 bg-slate-50 p-2.5 rounded-lg border border-gray-100">
                    <span className="font-medium">Период: <strong>Январь — Июнь 2026</strong></span>
                    <span className="flex items-center gap-2 font-semibold">
                      <span className="w-2.5 h-2.5 bg-[#138d8a] rounded" /> Поступления (дебет)
                      <span className="w-2.5 h-2.5 bg-yellow-400 rounded" /> Расходы (кредит)
                    </span>
                  </div>

                  {/* The exact representation of Sber style bar charts in visual SVG */}
                  <svg viewBox="0 0 600 240" className="w-full h-auto">
                    {/* SVG grid lines */}
                    <line x1="40" y1="30" x2="580" y2="30" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="80" x2="580" y2="80" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="130" x2="580" y2="130" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="180" x2="580" y2="180" stroke="#f1f5f9" strokeWidth="1" />
                    <line x1="40" y1="200" x2="580" y2="200" stroke="#94a3b8" strokeWidth="1.5" />

                    {/* Left vertical Y Axis indicators */}
                    <text x="30" y="34" fill="#94a3b8" fontSize="10" textAnchor="end">10k</text>
                    <text x="30" y="84" fill="#94a3b8" fontSize="10" textAnchor="end">5k</text>
                    <text x="30" y="134" fill="#94a3b8" fontSize="10" textAnchor="end">2.5k</text>
                    <text x="30" y="184" fill="#94a3b8" fontSize="10" textAnchor="end">500</text>
                    <text x="30" y="204" fill="#94a3b8" fontSize="10" textAnchor="end">0</text>

                    {/* Sber bank corporate bars group for 6 months */}
                    {/* Jan */}
                    <g className="cursor-pointer hover:opacity-85 transition-opacity">
                      <rect x="75" y="60" width="18" height="140" fill="#138d8a" rx="2" />
                      <rect x="96" y="90" width="18" height="110" fill="#facc15" rx="2" />
                      <text x="94" y="218" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Янв</text>
                    </g>

                    {/* Feb */}
                    <g className="cursor-pointer hover:opacity-85 transition-opacity">
                      <rect x="155" y="80" width="18" height="120" fill="#138d8a" rx="2" />
                      <rect x="176" y="110" width="18" height="90" fill="#facc15" rx="2" />
                      <text x="174" y="218" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Фев</text>
                    </g>

                    {/* Mar */}
                    <g className="cursor-pointer hover:opacity-85 transition-opacity">
                      <rect x="235" y="45" width="18" height="155" fill="#138d8a" rx="2" />
                      <rect x="256" y="70" width="18" height="130" fill="#facc15" rx="2" />
                      <text x="254" y="218" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Мар</text>
                    </g>

                    {/* Apr */}
                    <g className="cursor-pointer hover:opacity-85 transition-opacity">
                      <rect x="315" y="95" width="18" height="105" fill="#138d8a" rx="2" />
                      <rect x="336" y="125" width="18" height="75" fill="#facc15" rx="2" />
                      <text x="334" y="218" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Апр</text>
                    </g>

                    {/* May */}
                    <g className="cursor-pointer hover:opacity-85 transition-opacity">
                      <rect x="395" y="55" width="18" height="145" fill="#138d8a" rx="2" />
                      <rect x="416" y="85" width="18" height="115" fill="#facc15" rx="2" />
                      <text x="414" y="218" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Май</text>
                    </g>

                    {/* Jun */}
                    <g className="cursor-pointer hover:opacity-85 transition-opacity">
                      <rect x="475" y="30" width="18" height="170" fill="#138d8a" rx="2" />
                      <rect x="496" y="50" width="18" height="150" fill="#facc15" rx="2" />
                      <text x="494" y="218" fill="#475569" fontSize="10" textAnchor="middle" fontWeight="bold">Июн</text>
                    </g>
                  </svg>
                  
                  <div className="mt-4 text-[11px] text-gray-405 text-center font-medium italic">
                    * Наведите курсор на интересующий месяц для глубокого финансового анализа оборотов. Данные обновляются в реальном времени.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SubSection 4: "Движение по счетам / Документы" Collapsible Panel (Screenshot 5) */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
            <button 
              onClick={() => setMovementOpen(prev => !prev)}
              className="w-full px-5 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors border-b border-gray-100"
            >
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 text-[#138d8a] flex items-center justify-center">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4.5 h-4.5">
                    <rect x="3" y="4" width="18" height="16" rx="2" />
                    <line x1="7" y1="8" x2="17" y2="8" />
                    <line x1="7" y1="12" x2="13" y2="12" />
                  </svg>
                </div>
                <span className="font-extrabold text-[#2c3e50] text-sm uppercase tracking-wider">
                  Движение по счетам / Документы
                </span>
                <span className="text-[10px] bg-gray-100 px-2 py-0.5 rounded-full font-bold text-gray-500">
                  {documents.length} док.
                </span>
              </div>
              <div className="flex items-center gap-1">
                {movementOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </div>
            </button>

            {movementOpen && (
              <div className="overflow-x-auto anim-fadeIn">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-gray-100 text-gray-400 uppercase tracking-widest text-[9px] font-bold">
                      <th className="py-3 px-5">Номер / Дата</th>
                      <th className="py-3 px-5">Тип операции</th>
                      <th className="py-3 px-5">Получатель (Контрагент)</th>
                      <th className="py-3 px-5">Назначение платежа</th>
                      <th className="py-3 px-5 text-right">Сумма</th>
                      <th className="py-3 px-5 text-center">Статус</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {documents.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-10 text-center text-gray-400 font-medium">
                          Платежные документы отсутствуют. Нажмите «Создать документ» для добавления.
                        </td>
                      </tr>
                    ) : (
                      documents.map((doc) => (
                        <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-3.5 px-5 font-semibold text-gray-800">
                            <div>{doc.id}</div>
                            <div className="text-[10px] text-gray-400 font-normal mt-0.5">{doc.date}</div>
                          </td>
                          <td className="py-3.5 px-5 text-gray-600 font-medium">{doc.type}</td>
                          <td className="py-3.5 px-5 font-bold text-gray-800">{doc.counterparty}</td>
                          <td className="py-3.5 px-5 max-w-[200px] truncate text-gray-500" title={doc.purpose}>
                            {doc.purpose}
                          </td>
                          <td className="py-3.5 px-5 text-right font-extrabold text-gray-900 whitespace-nowrap">
                            - {doc.amount.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {doc.currency}
                          </td>
                          <td className="py-3.5 px-5 text-center">
                            <div className="flex flex-col items-center gap-1.5 justify-center">
                              {/* Status Badging with colored indicator circles */}
                              <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                doc.status === 'Проведен' 
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-150' 
                                  : doc.status === 'На подписи'
                                    ? 'bg-amber-50 text-amber-700 border-amber-150 animate-pulse'
                                    : 'bg-slate-50 text-slate-500 border-slate-150'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${
                                  doc.status === 'Проведен' ? 'bg-emerald-500' : doc.status === 'На подписи' ? 'bg-amber-500' : 'bg-gray-400'
                                }`} />
                                {doc.status}
                              </span>

                              {/* Action to click to Sign documents which are pending signature */}
                              {doc.status === 'На подписи' && (
                                <button 
                                  onClick={() => startSign(doc)}
                                  className="text-[9px] bg-amber-600 font-black hover:bg-amber-700 text-white px-2 py-0.5 rounded cursor-pointer leading-tight transition-all active:scale-95"
                                >
                                  Подписать SMS
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Supporting widgets (Screenshot 5 RHS options) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Sberbank Quick Links Panel (Screenshot 5 RHS options) */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-5 space-y-4">
            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 pb-2">
              Быстрые сервисы
            </h4>
            
            <div className="divide-y divide-gray-100">
              {/* Option 1: Документы на подписании */}
              <button 
                onClick={() => {
                  const pendingCount = documents.filter(d => d.status === 'На подписи').length;
                  if (pendingCount > 0) {
                    const doc = documents.find(d => d.status === 'На подписи')!;
                    startSign(doc);
                  } else {
                    alert('Нет документов, ожидающих вашей цифровой подписи.');
                  }
                }}
                className="w-full flex items-center justify-between py-3 hover:text-[#138d8a] transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <FileCheck2 className="w-5 h-5 text-gray-400 group-hover:text-[#138d8a]" />
                  <div>
                    <div className="text-xs font-extrabold text-gray-805 leading-none">Документы на подписании</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">Ожидают подписи: {documents.filter(d => d.status === 'На подписи').length}</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#138d8a]" />
              </button>

              {/* Option 2: Кредиты */}
              <button 
                onClick={() => onOpenQuickAction('loans')}
                className="w-full flex items-center justify-between py-3 hover:text-[#138d8a] transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <Percent className="w-5 h-5 text-gray-400 group-hover:text-[#138d8a]" />
                  <div>
                    <div className="text-xs font-extrabold text-gray-805 leading-none">Кредиты бизнеса</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">Доступен овердрафт: до 50 000 BYN</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#138d8a]" />
              </button>

              {/* Option 3: Корпоративные карты */}
              <button 
                onClick={() => onOpenQuickAction('corp-cards')}
                className="w-full flex items-center justify-between py-3 hover:text-[#138d8a] transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <CreditCard className="w-5 h-5 text-gray-400 group-hover:text-[#138d8a]" />
                  <div>
                    <div className="text-xs font-extrabold text-gray-805 leading-none">Корпоративные карты</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">Активно бизнес-карт: 2 шт.</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#138d8a]" />
              </button>

              {/* Option 4: Контрагенты */}
              <button 
                onClick={() => setVerifyModalOpen(true)}
                className="w-full flex items-center justify-between py-3 hover:text-[#138d8a] transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <Building2 className="w-5 h-5 text-gray-400 group-hover:text-[#138d8a]" />
                  <div>
                    <div className="text-xs font-extrabold text-gray-805 leading-none">Контрагенты</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">Проверка благонадежности (УНП)</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#138d8a]" />
              </button>

              {/* Option 5: Сотрудники */}
              <button 
                onClick={() => onOpenQuickAction('employees')}
                className="w-full flex items-center justify-between py-3 hover:text-[#138d8a] transition-colors group text-left"
              >
                <div className="flex items-center gap-3">
                  <Users2 className="w-5 h-5 text-gray-400 group-hover:text-[#138d8a]" />
                  <div>
                    <div className="text-xs font-extrabold text-gray-80.5 leading-none">Сотрудники компании</div>
                    <div className="text-[10px] text-gray-400 font-medium mt-1">Реестр зарплатных карт клиентов</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-[#138d8a]" />
              </button>
            </div>
          </div>

          {/* Current Currencies Conversion Widget with Live Input */}
          <div className="bg-white rounded-2xl border border-gray-150 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-gray-150 pb-2">
              <ArrowRightLeft className="w-4.5 h-4.5 text-[#138d8a]" />
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest leading-none">
                Курсы валют ОАО «Сбер Банк»
              </h4>
            </div>

            {/* Currency Rates Display */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs bg-slate-50 p-2.5 rounded-lg border border-gray-100">
              <div>
                <span className="text-gray-400 font-bold block">Валюта</span>
                <span className="font-extrabold text-gray-700 block mt-1">USD/BYN</span>
                <span className="font-extrabold text-gray-700 block">EUR/BYN</span>
                <span className="font-extrabold text-gray-700 block">RUB/BYN</span>
              </div>
              <div>
                <span className="text-[#138d8a] font-bold block">Покупка</span>
                <span className="font-black text-[#138d8a] block mt-1">3.2200</span>
                <span className="font-black text-[#138d8a] block">3.4900</span>
                <span className="font-black text-[#138d8a] block">3.4100</span>
              </div>
              <div>
                <span className="text-amber-600 font-bold block">Продажа</span>
                <span className="font-black text-amber-600 block mt-1">3.2650</span>
                <span className="font-black text-amber-600 block">3.5450</span>
                <span className="font-black text-amber-600 block">3.4800</span>
              </div>
            </div>

            {/* Interactive Calculator */}
            <div className="space-y-3 pt-2">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Калькулятор конверсий</span>
              
              <div className="flex items-center gap-2">
                <input 
                  type="number" 
                  value={calcAmount} 
                  onChange={(e) => setCalcAmount(e.target.value)}
                  placeholder="Сумма"
                  className="flex-1 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-1 focus:ring-[#138d8a] focus:border-[#138d8a] font-black text-gray-800"
                />
                
                <select 
                  value={fromCurr} 
                  onChange={(e) => setFromCurr(e.target.value as any)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-gray-700 focus:ring-1 focus:ring-[#138d8a]"
                >
                  <option value="BYN">BYN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                </select>

                <span className="text-gray-400 text-xs font-black">➡</span>

                <select 
                  value={toCurr} 
                  onChange={(e) => setToCurr(e.target.value as any)}
                  className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs font-bold bg-white text-gray-700 focus:ring-1 focus:ring-[#138d8a]"
                >
                  <option value="BYN">BYN</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="RUB">RUB</option>
                </select>
              </div>

              <div className="bg-emerald-50/55 p-2 rounded-lg border border-emerald-100 text-right text-xs">
                <span className="text-emerald-700 font-medium mr-1.5">Результат (ориентировочно):</span>
                <span className="font-extrabold text-emerald-900 text-sm">
                  {convertCurrency()} {toCurr}
                </span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* MODAL 1: Digital Sber SMS Signature Code (Fid-mode) */}
      {signatureModalOpen && selectedDocToSign && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-md w-full shadow-xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-[#2c3e50] uppercase tracking-wide">
                Цифровая подпись документа
              </span>
              <button onClick={() => setSignatureModalOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs text-gray-600">
              <p>Вы подписываете платежное поручение <strong>{selectedDocToSign.id}</strong> от {selectedDocToSign.date}.</p>
              <div className="bg-slate-50 p-3 rounded-lg border border-gray-150 space-y-1">
                <div>Получатель: <strong>{selectedDocToSign.counterparty}</strong></div>
                <div>Назначение: <span>{selectedDocToSign.purpose}</span></div>
                <div className="text-sm font-black text-gray-900 pt-1.5 border-t mt-1.5">
                  Сумма операции: {selectedDocToSign.amount.toLocaleString()} {selectedDocToSign.currency}
                </div>
              </div>

              {!smsSent ? (
                <div className="pt-2">
                  <p className="mb-3">Для подтверждения финансовой операции требуется получить разовый пароль безопасности СМС-код на ваш присоединенный номер телефона.</p>
                  <button 
                    onClick={sendSmsNotification}
                    className="w-full py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white text-xs font-bold rounded-lg transition"
                  >
                    Запросить СМС-код подписи
                  </button>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-gray-700">Код подтверждения из СМС (симуляция: введите код <strong>12345</strong>)</label>
                  <input 
                    type="text" 
                    value={smsCode} 
                    onChange={(e) => setSmsCode(e.target.value)}
                    placeholder="Введите 5-значный код"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-center text-sm font-black tracking-widest focus:ring-[#138d8a] focus:border-[#138d8a]"
                    maxLength={5}
                  />
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSmsSent(false)}
                      className="flex-1 py-2 text-xs font-bold text-gray-500 border rounded-lg hover:bg-slate-50"
                    >
                      Назад
                    </button>
                    <button 
                      onClick={submitSignature}
                      disabled={signProgress || smsCode !== '12345'}
                      className="flex-1 py-2 bg-[#128e8b] hover:bg-[#107c79] disabled:bg-gray-200 text-white text-xs font-bold rounded-lg transition-all"
                    >
                      {signProgress ? 'Авторизация...' : 'Подтвердить в Сбере'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: Counterparty Verification (Belarus UNP Check) */}
      {verifyModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 max-w-lg w-full shadow-xl space-y-4 font-sans animate-scaleIn">
            <div className="flex items-center justify-between border-b pb-2">
              <span className="font-extrabold text-sm text-[#2c3e50] uppercase tracking-wide">
                Проверка надежности контрагента (УНП Республики Беларусь)
              </span>
              <button onClick={() => { setVerifyModalOpen(false); setVerifyResult(null); }} className="text-gray-400 hover:text-gray-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleVerifyTaxId} className="space-y-3.5">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 w-4.5 h-4.5 text-gray-400" />
                  <input 
                    type="text" 
                    value={unpInput} 
                    onChange={(e) => setUnpInput(e.target.value)}
                    placeholder="Введите 9-значный УНП партнера"
                    className="w-full border border-gray-300 rounded-lg pl-10 pr-3 py-2 text-xs focus:ring-[#138d8a] focus:border-[#138d8a] font-semibold"
                    maxLength={9}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={verifyLoading}
                  className="bg-[#138d8a] text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-[#0f7270] disabled:bg-gray-300"
                >
                  {verifyLoading ? 'Поиск...' : 'Проверить'}
                </button>
              </div>
              <p className="text-[11px] text-gray-450 italic">
                Живой пример: введите УНП <strong>190823432</strong> или <strong>190552317</strong>.
              </p>
            </form>

            {verifyResult && (
              <div className="space-y-3.5 border-t pt-3 animate-fadeIn text-xs">
                {verifyResult.valid ? (
                  <div className="bg-slate-50 p-4 rounded-xl border border-gray-150 space-y-2.5 select-text">
                    <div className="flex items-center justify-between border-b pb-1.5">
                      <span className="font-extrabold text-[#2c3e50]">{verifyResult.name}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        verifyResult.status === 'АКТИВЕН' 
                          ? 'bg-emerald-100 text-emerald-800' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {verifyResult.status}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-y-2 text-gray-600">
                      <div>УНП:</div>
                      <div className="font-black text-gray-900">{verifyResult.unp}</div>

                      <div>Индикатор благонадежности:</div>
                      <div className="font-black text-emerald-700">{verifyResult.scoring}</div>
                      
                      <div>Статус судебных споров & ФСЗН:</div>
                      <div className="font-medium text-gray-750">{verifyResult.sanctions}</div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-red-50 text-red-700 p-3 rounded-lg border border-red-100">
                    {verifyResult.message}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
