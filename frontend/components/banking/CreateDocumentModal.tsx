"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  X,
  ArrowLeft,
  Wallet,
  Zap,
  CreditCard,
  Calendar,
  User,
  Briefcase,
  Sparkles,
  CheckCircle2,
  Info,
  HelpCircle,
} from "lucide-react";
import { useRole } from "@/store/roleStore";
import { useBankingStore } from "@/store/bankingStore";
import { bankingToast } from "@/lib/banking/toast";

interface CreateDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateDocumentModal({ isOpen, onClose }: CreateDocumentModalProps) {
  const router = useRouter();
  const accounts = useBankingStore((s) => s.accounts);
  const createPayment = useBankingStore((s) => s.createPayment);
  const { can, denyTitle } = useRole();
  const canSign = can('sign_document');
  // Sub-views states for modal content details
  // null -> main 3x3 grid
  // 'payout_byn' -> BYN Payment
  // 'payout_instant' -> Fast payment
  // 'payout_erip' -> ERIP Payment
  // 'payout_fx_internal' -> currency transfer inside Belarus
  // 'payout_fx_external' -> currency transfer outside Belarus (SWIFT)
  // 'payout_corpcard' -> Transfer to corporate card
  // 'payout_payroll_no_contract' -> Payment to individual without contract
  const [subView, setSubView] = useState<string | null>(null);

  // Form Field State managers
  const [sourceAcc, setSourceAcc] = useState(accounts.filter(a => a.currency === 'BYN')[0]?.id || '');
  const [rcptName, setRcptName] = useState('');
  const [rcptIban, setRcptIban] = useState('');
  const [rcptUnp, setRcptUnp] = useState('');
  const [rcptBic, setRcptBic] = useState('');
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('');
  const [currency, setCurrency] = useState<'BYN' | 'USD' | 'EUR' | 'RUB'>('BYN');

  // ERIP Specific
  const [eripCode, setEripCode] = useState('14.2.1');
  const [eripPayerId, setEripPayerId] = useState('19045389');

  // SWIFT Specific
  const [swiftCode, setSwiftCode] = useState('');
  const [intermediaryBank, setIntermediaryBank] = useState('');
  const [beneficiaryAddress, setBeneficiaryAddress] = useState('');

  // Corporate Card Specific
  const [targetCard, setTargetCard] = useState('**** 5678');

  // Payout without Contract Specific
  const [passportSeries, setPassportSeries] = useState('MP');
  const [passportNum, setPassportNum] = useState('2231456');

  const bynAccounts = accounts.filter(acc => acc.currency === 'BYN');
  const allAccounts = accounts;

  // Reset Sub-views fields
  const resetFormFields = () => {
    setSourceAcc(accounts.filter(a => a.currency === 'BYN')[0]?.id || '');
    setRcptName('');
    setRcptIban('');
    setRcptUnp('');
    setRcptBic('');
    setAmount('');
    setPurpose('');
    setCurrency('BYN');
    setEripCode('14.2.1');
    setEripPayerId('19045389');
    setSwiftCode('');
    setIntermediaryBank('');
    setBeneficiaryAddress('');
    setTargetCard('**** 5678');
    setPassportSeries('MP');
    setPassportNum('2231456');
  };

  const handleBackToGrid = () => {
    setSubView(null);
    resetFormFields();
  };

  const handleCloseAll = () => {
    onClose();
    resetFormFields();
    setSubView(null);
  };

  const handleAddNewDocument = async (
    type: string,
    counterparty: string,
    docAmount: number,
    docCurrency: "BYN" | "USD" | "EUR" | "RUB",
    docPurpose: string,
  ) => {
    const selectedAcc = accounts.find((a) => a.id === sourceAcc);
    if (selectedAcc && selectedAcc.balance < docAmount) {
      alert(
        `Недостаточно средств на выбранном счете. Доступно: ${selectedAcc.balance.toLocaleString()} ${selectedAcc.currency}`,
      );
      return false;
    }
    try {
      await createPayment({ type, counterparty, amount: docAmount, currency: docCurrency, purpose: docPurpose });
      bankingToast(`${type} сохранён как черновик`);
      handleCloseAll();
      return true;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Ошибка создания документа");
      return false;
    }
  };

  // Fast filling preset templates
  const applyAutofillPreset = (preset: 'telecom' | 'rent' | 'tax') => {
    if (preset === 'telecom') {
      setRcptName('ООО БелтелекомСоб');
      setRcptIban('BY33BPSB30121111903420000000');
      setRcptUnp('100654812');
      setAmount('115.00');
      setPurpose('Оплата услуг высокоскоростного корпоративного интернета за май 2026г. Без НДС.');
    } else if (preset === 'rent') {
      setRcptName('ООО ПорталДевелопмент');
      setRcptIban('BY18BPSB30125555432109870000');
      setRcptUnp('190284521');
      setAmount('1250.00');
      setPurpose('Арендная плата за пользование офисом за май 2026г. согласно договору №12-АР от 11.01.2025.');
    } else if (preset === 'tax') {
      setRcptName('ИМНС РБ по Центральному району г. Минска');
      setRcptIban('BY88AKBB36009000001240000000');
      setRcptUnp('101340911');
      setAmount('450.00');
      setPurpose('Уплата подоходного налога за сотрудников за май 2026г. Назначение платежа: 01001.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[#000504]/50 z-50 flex items-center justify-center p-4 overflow-y-auto block select-none">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        transition={{ duration: 0.2, ease: 'easeOut' }}
        className="bg-white rounded-[20px] w-full max-w-[960px] shadow-2xl relative overflow-hidden flex flex-col my-8"
        id="create-document-modal-container"
      >
        {/* Modal Top Header Bar */}
        <div className="px-6 py-5 border-b border-gray-150 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-2">
            {subView && (
              <button 
                onClick={handleBackToGrid}
                className="p-1 px-2.5 mr-1 hover:bg-gray-100 rounded-lg text-gray-450 transition-all flex items-center gap-1 font-extrabold text-xs focus:outline-none cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-gray-500" />
                <span>Назад</span>
              </button>
            )}
            <h2 className="text-lg font-black text-gray-900 font-display uppercase tracking-widest">
              {subView === null && 'Новый документ'}
              {subView === 'payout_byn' && 'Платежное поручение (BYN) внутри РБ'}
              {subView === 'payout_instant' && 'Мгновенный платеж (BYN)'}
              {subView === 'payout_erip' && 'Платеж в ЕРИП'}
              {subView === 'payout_fx_internal' && 'Перевод инвалюты внутри РБ'}
              {subView === 'payout_fx_external' && 'Перевод инвалюты за пределы РБ (SWIFT)'}
              {subView === 'payout_corpcard' && 'Перевод на корпокарту'}
              {subView === 'payout_payroll_no_contract' && 'Выплата физлицу без договора'}
            </h2>
          </div>
          <button 
            onClick={handleCloseAll}
            className="p-1 text-gray-400 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-all focus:outline-none cursor-pointer"
          >
            <X className="w-5.5 h-5.5 stroke-[2.2]" />
          </button>
        </div>

        {/* Modal Inner Workspace */}
        <div className="p-6 overflow-y-auto max-h-[calc(85vh-100px)] bg-[#fbfcff]">
          <AnimatePresence mode="wait">
            
            {/* 1. SBER 3x3 SELECTOR GRID (Matches screenshot exactly) */}
            {subView === null && (
              <motion.div
                key="grid-selector"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="space-y-4"
              >
                {/* 3x3 Classic Sber Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 border-t border-l border-gray-200 rounded-[14px] overflow-hidden bg-white shadow-3xs" id="sber-documents-grid-table">
                  {/* CELL 1: BYN Payout */}
                  <div 
                    onClick={() => setSubView('payout_byn')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-[#008064] transition-colors mb-3.5 shadow-3xs">
                      <Wallet className="w-6.5 h-6.5 stroke-[1.5]" />
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                      Платежное поручение (BYN) внутри РБ
                    </span>
                  </div>

                  {/* CELL 2: Instant BYN Payment */}
                  <div 
                    onClick={() => setSubView('payout_instant')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-amber-600 transition-colors mb-3.5 shadow-3xs">
                      <div className="relative">
                        <Wallet className="w-6.5 h-6.5 stroke-[1.5]" />
                        <Zap className="w-4 h-4 text-amber-500 fill-amber-500 absolute -top-1 -right-1" />
                      </div>
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                      Мгновенный платеж (BYN)
                    </span>
                  </div>

                  {/* CELL 3: ERIP admin procedures */}
                  <div 
                    onClick={() => setSubView('payout_erip')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-emerald-50 group-hover:text-[#008064] transition-colors mb-3.5 shadow-3xs">
                      {/* Stylized ЕРИП logo */}
                      <div className="flex items-center text-gray-500 group-hover:text-[#008064] font-black text-[13px] leading-none select-none">
                        <span className="text-[#008064] font-serif text-lg leading-none mr-0.5">»</span>
                        <span className="tracking-tighter lowercase">ерип</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-center gap-1">
                      <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                        Платеж в ЕРИП (административные процедуры)
                      </span>
                      <HelpCircle className="w-3.5 h-3.5 text-gray-300 pointer-events-none" />
                    </div>
                  </div>

                  {/* CELL 4: Forex Transfer Internal */}
                  <div 
                    onClick={() => setSubView('payout_fx_internal')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-teal-50 group-hover:text-teal-600 transition-colors mb-3.5 shadow-3xs">
                      {/* Stylized Belarus Map Vector */}
                      <svg className="w-7 h-7" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M 35 25 L 55 20 L 75 30 L 80 50 L 70 75 L 50 85 L 25 75 L 20 50 L 25 35 Z" fill="none" />
                        <text x="50" y="58" fontSize="23" fontWeight="bold" textAnchor="middle" stroke="none" fill="currentColor">$</text>
                      </svg>
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                      Перевод инвалюты внутри РБ
                    </span>
                  </div>

                  {/* CELL 5: Forex Transfer External (SWIFT) */}
                  <div 
                    onClick={() => setSubView('payout_fx_external')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors mb-3.5 shadow-3xs">
                      <svg className="w-7 h-7" viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M 35 25 L 55 20 L 72 30 L 78 50 L 70 75 L 50 85 L 25 75 L 20 50 L 25 35 Z" fill="none" />
                        <text x="46" y="58" fontSize="23" fontWeight="bold" textAnchor="middle" stroke="none" fill="currentColor">$</text>
                        <path d="M 60 40 L 85 15 M 85 15 L 72 15 M 85 15 L 85 28" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black pr-6">
                      Перевод инвалюты за пределы РБ
                    </span>
                    <span className="absolute right-4.5 text-gray-300 group-hover:text-gray-500 font-extrabold font-mono text-sm leading-none">&gt;</span>
                  </div>

                  {/* CELL 6: Transfer to Corporate Card */}
                  <div 
                    onClick={() => setSubView('payout_corpcard')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-sky-50 group-hover:text-sky-600 transition-colors mb-3.5 shadow-3xs">
                      <div className="relative">
                        <CreditCard className="w-6.5 h-6.5 stroke-[1.5]" />
                        <span className="absolute -bottom-1 -right-1 text-[9px] font-black bg-emerald-500 text-white rounded px-0.5 border border-white">CARD</span>
                      </div>
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                      Перевод на корпокарту
                    </span>
                  </div>

                  {/* CELL 7: Payouts with bank contract */}
                  <div 
                    onClick={() => {
                      router.push("/salary");
                      onClose();
                    }}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-rose-50 group-hover:text-rose-600 transition-colors mb-3.5 shadow-3xs">
                      <div className="relative">
                        <Calendar className="w-6.5 h-6.5 stroke-[1.5]" />
                        <span className="absolute bottom-0 right-0 bg-rose-500 text-white font-mono text-[8.5px] font-black rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">1</span>
                      </div>
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-rose-955">
                      Выплаты физическим лицам (по договору с банком)
                    </span>
                  </div>

                  {/* CELL 8: Payout to individual without contract */}
                  <div 
                    onClick={() => setSubView('payout_payroll_no_contract')}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-[#eafaf4] group-hover:text-indigo-600 transition-colors mb-3.5 shadow-3xs">
                      <div className="flex items-end gap-0.5">
                        <User className="w-5.5 h-5.5 stroke-[1.8]" />
                        <div className="flex flex-col gap-0.5 border-l pl-0.5 border-gray-350">
                          <span className="w-1.5 h-1.5 bg-gray-500 rounded-full"></span>
                          <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                        </div>
                      </div>
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                      Выплаты физическому лицу (без договора с банком)
                    </span>
                  </div>

                  {/* CELL 9: Product application form */}
                  <div 
                    onClick={() => {
                      router.push("/products");
                      onClose();
                    }}
                    className="border-r border-b border-gray-200 p-8 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50/50 group transition-all relative min-h-[170px]"
                  >
                    <div className="w-13 h-13 rounded-xl bg-gray-50 flex items-center justify-center text-gray-500 group-hover:bg-amber-50 group-hover:text-amber-500 transition-colors mb-3.5 shadow-3xs">
                      <Briefcase className="w-6.5 h-6.5 stroke-[1.5]" />
                    </div>
                    <span className="text-[12px] font-extrabold text-gray-750 font-display leading-tight max-w-[200px] tracking-tight group-hover:text-black">
                      Заявка на предоставление продукта (услуги)
                    </span>
                  </div>
                </div>
              </motion.div>
            )}

            {/* 2. SUBVIEW: BYN PAYMENT FORM (with preset templates) */}
            {subView === 'payout_byn' && (
              <motion.div
                key="payout-byn"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-5 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                {/* Sber Fast Preset Autofills */}
                <div className="bg-[#008064]/5 border border-[#008064]/20 p-4 rounded-xl space-y-2">
                  <div className="flex items-center gap-1.5 text-[#008064] font-black text-[11px] uppercase tracking-wider">
                    <Sparkles className="w-4 h-4 text-[#008064] fill-[#008064]" />
                    <span>Ускоренное автозаполнение реквизитов</span>
                  </div>
                  <p className="text-[10.5px] text-gray-550 font-medium">Выберите один из демонстрационных шаблонов, чтобы мгновенно подставить данные:</p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => applyAutofillPreset('rent')}
                      className="bg-white hover:bg-emerald-50 border border-gray-200 hover:border-[#008064] text-[10px] font-bold px-3 py-1.5 rounded-lg text-gray-700 transition"
                    >
                      🏢 Аренда офиса (ООО ПорталДевелопмент)
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyAutofillPreset('telecom')}
                      className="bg-white hover:bg-emerald-50 border border-gray-200 hover:border-[#008064] text-[10px] font-bold px-3 py-1.5 rounded-lg text-gray-700 transition"
                    >
                      📞 Интернет (ОАО Белтелеком)
                    </button>
                    <button 
                      type="button"
                      onClick={() => applyAutofillPreset('tax')}
                      className="bg-white hover:bg-emerald-50 border border-gray-200 hover:border-[#008064] text-[10px] font-bold px-3 py-1.5 rounded-lg text-gray-700 transition"
                    >
                      🏛 Налоги УСН (ИМНС района)
                    </button>
                  </div>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!sourceAcc || !rcptName || !rcptIban || !amount) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument('Перевод в BYN', rcptName, parseFloat(amount), 'BYN', purpose || 'Оплата услуг по договору');
                }} className="space-y-4">
                  
                  {/* Source Acc */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать со счета (BYN) *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-semibold bg-white text-gray-800"
                      required
                    >
                      {bynAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} BYN
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recipient Name */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Получатель (Название / ФИО) *</label>
                      <input 
                        type="text"
                        value={rcptName}
                        onChange={(e) => setRcptName(e.target.value)}
                        placeholder="ООО Ромашка или Физлицо"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold"
                        required
                      />
                    </div>

                    {/* Recipient Tax UNP code */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">УНП / Налоговый код</label>
                      <input 
                        type="text"
                        value={rcptUnp}
                        onChange={(e) => setRcptUnp(e.target.value)}
                        placeholder="9-значный УНП"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-semibold font-mono"
                        maxLength={9}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* IBAN */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Счет получателя (IBAN) *</label>
                      <input 
                        type="text"
                        value={rcptIban}
                        onChange={(e) => setRcptIban(e.target.value)}
                        placeholder="BYXXBPSB..."
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono uppercase"
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма (BYN) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-900 text-sm"
                        required
                      />
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Назначение платежа</label>
                    <textarea 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Оплата за товары/услуги..."
                      className="w-full border border-gray-300 rounded-lg p-2.5 h-18 resize-none font-medium text-gray-750"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button" 
                      onClick={handleBackToGrid} 
                      className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition focus:outline-none"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      disabled={!can('create_document')}
                      title={can('create_document') ? undefined : denyTitle('create_document')}
                      className="flex-1 py-3 bg-[#008064] hover:bg-[#00634f] text-white rounded-lg font-black tracking-wide transition focus:outline-none cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      Сохранить и сохранить черновик
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 3. SUBVIEW: INSTANT BYN PAYMENT */}
            {subView === 'payout_instant' && (
              <motion.div
                key="payout-instant"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                <div className="bg-amber-50/70 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2.5 text-amber-850">
                  <Zap className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0 mt-0.5" />
                  <p className="text-[10.5px] font-semibold leading-relaxed">
                    <strong>Мгновенный платеж</strong> — проводится межбанковским клирингом Сбера за 2-3 секунды независимо от времени суток и праздничных дней.
                  </p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!sourceAcc || !rcptName || !rcptIban || !amount) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument('Мгновенный перевод', rcptName, parseFloat(amount), 'BYN', purpose || 'Мгновенный экспресс-перевод');
                }} className="space-y-4">
                  {/* Account */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать с рублевого счета *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-semibold bg-white"
                      required
                    >
                      {bynAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} BYN
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Recipient Name */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Получатель *</label>
                      <input 
                        type="text"
                        value={rcptName}
                        onChange={(e) => setRcptName(e.target.value)}
                        placeholder="Например, ЧУП ЭкспрессГрупп"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold"
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма мгновенного перевода (BYN) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Сумма"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-950"
                        required
                      />
                    </div>
                  </div>

                  {/* Recipient IBAN */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Счет получателя IBAN *</label>
                    <input 
                      type="text"
                      value={rcptIban}
                      onChange={(e) => setRcptIban(e.target.value)}
                      placeholder="BYXXBPSB3012..."
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-mono uppercase font-bold"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBackToGrid} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition">Отмена</button>
                    <button
                      type="submit"
                      disabled={!canSign}
                      title={canSign ? undefined : denyTitle('sign_document')}
                      className="flex-1 py-3 bg-amber-550 hover:bg-amber-600 text-white rounded-lg font-black transition cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {canSign ? 'Отправить мгновенно' : 'Подпись только у Руководителя'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 4. SUBVIEW: ERIP PAYMENTS */}
            {subView === 'payout_erip' && (
              <motion.div
                key="payout-erip"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                <div className="bg-[#008064]/5 border border-[#008064]/20 p-4 rounded-xl">
                  <span className="text-[11px] font-black tracking-widest text-[#008064] uppercase block mb-1">» СИСТЕМА «РАСЧЕТ» (ЕРИП) для Биллинга</span>
                  <p className="text-[10.5px] leading-relaxed text-gray-550 font-medium">Оплата в пользу госструктур, за лицензирование или коммунальные услуги юридических лиц РБ по коду административной процедуры.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!sourceAcc || !eripPayerId || !amount) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument('Платеж ЕРИП', `ЕРИП Код: ${eripCode}`, parseFloat(amount), 'BYN', `Оплата гос. пошлины в ЕРИП, лицевой счет плательщика: ${eripPayerId}`);
                }} className="space-y-4">
                  {/* Account */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать с рублевого счета *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-semibold"
                      required
                    >
                      {bynAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} BYN
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Admin procedure code */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Код админ. процедуры или услуги *</label>
                      <select 
                        value={eripCode}
                        onChange={(e) => setEripCode(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-bold"
                      >
                        <option value="14.2.1">14.2.1 — Регистрация торгового знака</option>
                        <option value="3.1.2">3.1.2 — Выдача сертификата юрлица</option>
                        <option value="9.1.1">9.1.1 — Коммунальные услуги госсобственности</option>
                        <option value="2.3">2.3 — Получение выписки ЕГР</option>
                      </select>
                    </div>

                    {/* Payer Code ID */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Лицевой счет плательщика ЕРИП *</label>
                      <input 
                        type="text"
                        value={eripPayerId}
                        onChange={(e) => setEripPayerId(e.target.value)}
                        placeholder="Лицевой счет"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono"
                        required
                      />
                    </div>
                  </div>

                  {/* Fee Estimate */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-end">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма (BYN) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-900"
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    
                    <div className="bg-slate-50 p-2.5 border rounded-lg text-[10.5px]">
                      💸 <strong>Пошлина ЕРИП:</strong> 0% со стороны Сбер Банка. Автоматизированные реестры обновятся мгновенно.
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBackToGrid} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition">Отмена</button>
                    <button
                      type="submit"
                      disabled={!canSign}
                      title={canSign ? undefined : denyTitle('sign_document')}
                      className="flex-1 py-3 bg-[#008064] hover:bg-[#00634f] text-white rounded-lg font-black transition cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {canSign ? 'Сформировать платеж' : 'Подпись только у Руководителя'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 5. SUBVIEW: FOREIGN CURRENCY INTERNAL RB */}
            {subView === 'payout_fx_internal' && (
              <motion.div
                key="payout-fx-internal"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                <div className="bg-teal-50 border border-teal-200 p-4 rounded-xl">
                  <span className="text-[11px] font-black tracking-widest text-[#138d8a] uppercase block mb-1">Валютный перевод внутри стран Республики Беларусь</span>
                  <p className="text-[10.5px] leading-relaxed text-gray-600 font-medium font-sans">Осуществляется с соблюдением требований действующего валютного законодательства РБ по предоставлению документов валютного договора.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!rcptName || !rcptIban || !amount) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument(`Перевод в ${currency}`, rcptName, parseFloat(amount), currency, purpose || 'Валютные расчеты');
                }} className="space-y-4">
                  {/* Currency selector */}
                  <div className="grid grid-cols-3 gap-2 border p-2.5 rounded-lg bg-white">
                    {(['USD', 'EUR', 'RUB'] as const).map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setCurrency(curr);
                          const matchingAcc = accounts.filter(a => a.currency === curr);
                          if (matchingAcc.length > 0) {
                            setSourceAcc(matchingAcc[0].id);
                          }
                        }}
                        className={`py-2 text-center rounded-lg font-black block text-xs focus:outline-none ${currency === curr ? 'bg-[#138d8a] text-white shadow-xs' : 'bg-slate-50 text-gray-500 hover:bg-slate-100'}`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>

                  {/* Source Asset */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать с валютного счета *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-semibold"
                      required
                    >
                      {allAccounts.filter(a => a.currency === currency).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} {acc.currency}
                        </option>
                      ))}
                      {allAccounts.filter(a => a.currency === currency).length === 0 && (
                        <option value="">Счетов в {currency} не обнаружено</option>
                      )}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Beneficiary Name */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Получатель *</label>
                      <input 
                        type="text"
                        value={rcptName}
                        onChange={(e) => setRcptName(e.target.value)}
                        placeholder="Например, ОАО Беллегпром"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold"
                        required
                      />
                    </div>

                    {/* IBAN */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Счет получателя IBAN ({currency}) *</label>
                      <input 
                        type="text"
                        value={rcptIban}
                        onChange={(e) => setRcptIban(e.target.value)}
                        placeholder="BYXX...."
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-mono font-bold uppercase"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Transfer sum */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма перевода ({currency}) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-950"
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>

                    {/* Recipient Bank BIC */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">БИК Банка-получателя *</label>
                      <input 
                        type="text"
                        value={rcptBic}
                        onChange={(e) => setRcptBic(e.target.value)}
                        placeholder="BPSBBY2X"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono uppercase"
                        required
                      />
                    </div>
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Назначение платежа и код операции *</label>
                    <textarea 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="Код валютной операции. Оплата импорта промышленного оборудования согласно валютного договора №..."
                      className="w-full border border-gray-300 rounded-lg p-2.5 h-16 resize-none font-medium"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBackToGrid} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition">Отмена</button>
                    <button
                      type="submit"
                      disabled={!canSign}
                      title={canSign ? undefined : denyTitle('sign_document')}
                      className="flex-1 py-3 bg-[#138d8a] hover:bg-[#107c79] text-white rounded-lg font-black transition cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {canSign ? 'Создать валютный перевод' : 'Подпись только у Руководителя'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 6. SUBVIEW: TRANSFER OUTSIDE RB (SWIFT) */}
            {subView === 'payout_fx_external' && (
              <motion.div
                key="payout-fx-external"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl">
                  <span className="text-[11px] font-black tracking-widest text-[#008064] uppercase block mb-1">Международный валютный перевод (SWIFT) за рубеж</span>
                  <p className="text-[10.5px] leading-relaxed text-gray-650 font-medium">Безопасный экспортный и импортный клиринг во все доступные страны и банки-корреспонденты партнеров.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!rcptName || !rcptIban || !amount || !swiftCode) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument(`SWIFT перевод (${currency})`, rcptName, parseFloat(amount), currency, purpose || 'Зарубежный контракт поставки');
                }} className="space-y-4">
                  
                  {/* Currency selector */}
                  <div className="grid grid-cols-2 gap-2 border p-2 rounded-lg bg-white">
                    {(['USD', 'EUR'] as const).map(curr => (
                      <button
                        key={curr}
                        type="button"
                        onClick={() => {
                          setCurrency(curr);
                          const matchingAcc = accounts.filter(a => a.currency === curr);
                          if (matchingAcc.length > 0) {
                            setSourceAcc(matchingAcc[0].id);
                          }
                        }}
                        className={`py-1.5 text-center rounded-lg font-black block text-xs focus:outline-none ${currency === curr ? 'bg-[#008064] text-white' : 'bg-slate-50 text-gray-400'}`}
                      >
                        {curr}
                      </button>
                    ))}
                  </div>

                  {/* Asset account */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать с валютного счета *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-semibold"
                      required
                    >
                      {allAccounts.filter(a => a.currency === currency).map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} {acc.currency}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Beneficiary Name */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Beneficiary (Бенефициар в латинице) *</label>
                      <input 
                        type="text"
                        value={rcptName}
                        onChange={(e) => setRcptName(e.target.value)}
                        placeholder="e.g. TRADING CO CO., LTD"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono"
                        required
                      />
                    </div>

                    {/* Beneficiary Address */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Адрес Beneficiary *</label>
                      <input 
                        type="text"
                        value={beneficiaryAddress}
                        onChange={(e) => setBeneficiaryAddress(e.target.value)}
                        placeholder="Address, City, Country"
                        className="w-full border border-gray-300 rounded-lg p-2.5"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* SWIFT Bep code */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">SWIFT / BIC Code Получателя *</label>
                      <input 
                        type="text"
                        value={swiftCode}
                        onChange={(e) => setSwiftCode(e.target.value)}
                        placeholder="e.g., CHBADEHHXXX"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono uppercase"
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма к отправке ({currency}) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-950"
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  {/* Intermediary Bank */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Банк-Корреспондент / Intermediary Bank SWIFT</label>
                    <input 
                      type="text"
                      value={intermediaryBank}
                      onChange={(e) => setIntermediaryBank(e.target.value)}
                      placeholder="e.g., DEUTEDEDFFXXX (Опционально)"
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-mono uppercase font-semibold text-gray-700"
                    />
                  </div>

                  {/* Purpose */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Payment Purpose (Назначение платежа в латинице) *</label>
                    <textarea 
                      value={purpose}
                      onChange={(e) => setPurpose(e.target.value)}
                      placeholder="PAYMENT FOR INDUSTRIAL GOODS UNDER INVOICE NO..."
                      className="w-full border border-gray-300 rounded-lg p-2.5 h-16 resize-none font-medium font-mono"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBackToGrid} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition">Отмена</button>
                    <button
                      type="submit"
                      disabled={!canSign}
                      title={canSign ? undefined : denyTitle('sign_document')}
                      className="flex-1 py-3 bg-gradient-to-r from-teal-600 to-[#008064] text-white rounded-lg font-black transition cursor-pointer disabled:from-gray-300 disabled:to-gray-300 disabled:cursor-not-allowed"
                    >
                      {canSign ? 'Отправить SWIFT сообщение' : 'Подпись только у Руководителя'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 7. SUBVIEW: TRANSFER TO CORPORATE CARD */}
            {subView === 'payout_corpcard' && (
              <motion.div
                key="payout-corpcard"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                <div className="bg-sky-50 border border-sky-200 p-4 rounded-xl">
                  <span className="text-[11px] font-black tracking-widest text-[#138d8a] uppercase block mb-1">Мгновенное пополнение корпоративной карты</span>
                  <p className="text-[10.5px] leading-relaxed text-gray-650 font-medium">Беспроцентное внутреннее зачисление средств с расчетного счета юрлица на выделенный лимит корпоративной банковской карты.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!sourceAcc || !amount) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument('Пополнение корпокарты', `Карта: ${targetCard}`, parseFloat(amount), 'BYN', `Пополнение платежного лимита корпоративной карты`);
                }} className="space-y-4">
                  {/* Source Acc */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать со счета (BYN) *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-semibold"
                      required
                    >
                      {bynAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} BYN
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Target Card select */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Выбрать корпоративную карту Сбера *</label>
                      <select 
                        value={targetCard}
                        onChange={(e) => setTargetCard(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-bold"
                      >
                        <option value="**** 5678">**** 5678 (Добрый счёт/Карточный) — {accounts[1]?.balance || 300} BYN</option>
                        <option value="**** 1234">**** 1234 (Топливный лимит) — 0.00 BYN</option>
                        <option value="**** 9911">**** 9911 (Командировочные расходы) — 15.00 BYN</option>
                      </select>
                    </div>

                    {/* Transfer sum */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма зачисления (BYN) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-950"
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBackToGrid} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition">Отмена</button>
                    <button
                      type="submit"
                      disabled={!canSign}
                      title={canSign ? undefined : denyTitle('sign_document')}
                      className="flex-1 py-3 bg-[#138d8a] hover:bg-[#107c79] text-white rounded-lg font-black transition cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {canSign ? 'Перевести на карту' : 'Подпись только у Руководителя'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

            {/* 8. SUBVIEW: INDIVIDUAL PAYOUT WITHOUT CONTRACT */}
            {subView === 'payout_payroll_no_contract' && (
              <motion.div
                key="payout-payroll-no-contract"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                className="space-y-4 text-left text-xs text-gray-700 max-w-xl mx-auto"
              >
                <div className="bg-rose-50 border border-rose-150 p-4 rounded-xl text-rose-950">
                  <span className="text-[11px] font-black tracking-widest text-rose-800 uppercase block mb-1">Единоразовая выплата физлицу без долгосрочного договора</span>
                  <p className="text-[10.5px] leading-relaxed font-medium">Для расчетов по разовым работам, услугам или подрядам с обязательным удержанием и декларированием подоходного налога.</p>
                </div>

                <form onSubmit={(e) => {
                  e.preventDefault();
                  if (!rcptName || !rcptIban || !amount) {
                    alert('Заполните обязательные поля');
                    return;
                  }
                  handleAddNewDocument('Разовая выплата физлицу', rcptName, parseFloat(amount), 'BYN', `Разовая оплата услуг по договору подряда. Паспорт: ${passportSeries} ${passportNum}`);
                }} className="space-y-4">
                  {/* Source Acc */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Списать со счета (BYN) *</label>
                    <select 
                      value={sourceAcc}
                      onChange={(e) => setSourceAcc(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 bg-white font-semibold animate-none"
                      required
                    >
                      {bynAccounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} BYN
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-none">
                    {/* Recipient Full name */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">ФИО Получателя (Физлицо) *</label>
                      <input 
                        type="text"
                        value={rcptName}
                        onChange={(e) => setRcptName(e.target.value)}
                        placeholder="Полное имя на русском"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold animate-none"
                        required
                      />
                    </div>

                    {/* Amount */}
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Сумма гонорара (BYN) *</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={amount}
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-black text-gray-950"
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Сумма"
                        required
                      />
                    </div>
                  </div>

                  {/* Passport details */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-gray-700 mb-1">Серия паспорта *</label>
                      <input 
                        type="text"
                        value={passportSeries}
                        onChange={(e) => setPassportSeries(e.target.value)}
                        placeholder="Серия"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono uppercase text-center"
                        maxLength={2}
                        required
                      />
                    </div>

                    <div className="col-span-2">
                      <label className="block font-bold text-gray-700 mb-1">Номер паспорта *</label>
                      <input 
                        type="text"
                        value={passportNum}
                        onChange={(e) => setPassportNum(e.target.value)}
                        placeholder="Номер"
                        className="w-full border border-gray-300 rounded-lg p-2.5 font-bold font-mono"
                        maxLength={10}
                        required
                      />
                    </div>
                  </div>

                  {/* Recipient IBAN and UNP */}
                  <div>
                    <label className="block font-bold text-gray-700 mb-1">Текущий счет получателя (IBAN BYN) *</label>
                    <input 
                      type="text"
                      value={rcptIban}
                      onChange={(e) => setRcptIban(e.target.value)}
                      placeholder="BYXX...."
                      className="w-full border border-gray-300 rounded-lg p-2.5 font-mono uppercase font-bold"
                      required
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleBackToGrid} className="flex-1 py-3 border border-gray-200 text-gray-500 rounded-lg font-bold hover:bg-slate-50 transition">Отмена</button>
                    <button
                      type="submit"
                      disabled={!canSign}
                      title={canSign ? undefined : denyTitle('sign_document')}
                      className="flex-1 py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-black transition cursor-pointer disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      {canSign ? 'Провести выплату физлицу' : 'Подпись только у Руководителя'}
                    </button>
                  </div>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>

      </motion.div>
    </div>
  );
}
