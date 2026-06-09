import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MoreHorizontal, 
  FileText, 
  Receipt, 
  Calculator, 
  Shield, 
  TrendingUp, 
  Check, 
  Paperclip, 
  Mic, 
  ArrowLeft, 
  Download, 
  Send, 
  Share2, 
  Info, 
  ChevronRight, 
  Loader2,
  AlertCircle,
  Sparkles,
  MessageCircle,
  CheckSquare,
  Square,
  Search,
  BookOpen,
  Briefcase,
  GraduationCap,
  CreditCard,
  Percent,
  Wallet,
  Globe,
  Users,
  Network,
  PlayCircle,
  Clock
} from 'lucide-react';
import { useRole } from '../RoleContext';

interface CopilotProps {
  isOpen: boolean;
  onClose: () => void;
  onTriggerAutofillInCabinet?: (template: 'rent' | 'telecom' | 'tax') => void;
}

type CopilotScreen =
  | 'GREETING'       // Screenshot 1: 3x2 Grid Popular Queries, Logo and Large Button
  | 'DOC_PERIOD'     // Screenshot 5: Period Choice Cards (6 months vs 12 months)
  | 'DOC_FORMAT'     // Screenshot 3: Format Selector Checkboxes and Info Banner
  | 'DOC_PROGRESS'   // Screenshot 4: Progress Line and Checklist items with tips card
  | 'DOC_READY'      // Screenshot 2: Completed, PDF file card with Action Row (Download, Send, Share)
  | 'LEASE_PACKAGE'  // Screenshot 6: Three Document Bundle checkbox list
  | 'CO_FILL_DEMO'   // AI Automated Intelligent Autofill Screen
  | 'SERVICES'       // Сервисы банка: продуктовые плитки
  | 'KNOWLEDGE'      // База знаний: поиск + список документов
  | 'LEARNING'       // Обучение: прогресс + модули
  | 'CONSULT';        // Консультации: категории профессиональных вопросов

export default function Copilot({ isOpen, onClose, onTriggerAutofillInCabinet }: CopilotProps) {
  const { role } = useRole();
  // Assistant persona mirrors the current role (gender + portrait), greets the user by first name
  const assistantName = role.gender === 'male' ? 'Александр' : 'Александра';
  const assistantPortrait = role.portrait;
  const userFirstName = role.firstName;

  const [screen, setScreen] = useState<CopilotScreen>('GREETING');
  const [chatInput, setChatInput] = useState('');
  const [progressVal, setProgressVal] = useState(0);
  const [selectedFormat, setSelectedFormat] = useState<'pdf-sign' | 'pdf-print' | 'excel'>('pdf-sign');
  
  // Custom states for interactive lease checklist
  const [leaseChecks, setLeaseChecks] = useState({
    turnover: true,
    noDebt: true,
    statement: true,
  });

  // Copilot-side live typing animation for rent invoice
  const [coFillStep, setCoFillStep] = useState(0); // 0: initial, 1: typing, 2: complete
  const [coName, setCoName] = useState('');
  const [coIban, setCoIban] = useState('');
  const [coUnp, setCoUnp] = useState('');
  const [coAmount, setCoAmount] = useState('');
  const [coPurpose, setCoPurpose] = useState('');

  // Automatically advance progress state for DOC_PROGRESS screen
  useEffect(() => {
    let timer: any;
    let interval: any;
    if (screen === 'DOC_PROGRESS') {
      setProgressVal(0);
      let cur = 0;
      interval = setInterval(() => {
        cur += 4;
        if (cur > 100) cur = 100;
        setProgressVal(cur);
      }, 100);

      timer = setTimeout(() => {
        clearInterval(interval);
        setScreen('DOC_READY');
      }, 3000);
    }
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [screen]);

  // CO_FILL_DEMO live typing simulation
  useEffect(() => {
    if (screen !== 'CO_FILL_DEMO') {
      setCoFillStep(0);
      setCoName('');
      setCoIban('');
      setCoUnp('');
      setCoAmount('');
      setCoPurpose('');
      return;
    }

    if (coFillStep === 0) {
      const t = setTimeout(() => {
        setCoFillStep(1);
      }, 1000);
      return () => clearTimeout(t);
    }

    if (coFillStep === 1) {
      const targetName = 'ООО ПорталДевелопмент';
      const targetIban = 'BY18BPSB30125555432109870000';
      const targetUnp = '190284521';
      const targetAmount = '1450.00';
      const targetPurpose = 'Арендная плата за пользование офисными площадями за май 2026г. В том числе НДС.';

      let nameIdx = 0;
      let ibanIdx = 0;
      let unpIdx = 0;
      let amtIdx = 0;
      let purpIdx = 0;

      const interval = setInterval(() => {
        if (nameIdx < targetName.length) {
          nameIdx++;
          setCoName(targetName.slice(0, nameIdx));
        } else if (ibanIdx < targetIban.length) {
          ibanIdx++;
          setCoIban(targetIban.slice(0, ibanIdx));
        } else if (unpIdx < targetUnp.length) {
          unpIdx++;
          setCoUnp(targetUnp.slice(0, unpIdx));
        } else if (amtIdx < targetAmount.length) {
          amtIdx++;
          setCoAmount(targetAmount.slice(0, amtIdx));
        } else if (purpIdx < targetPurpose.length) {
          purpIdx++;
          setCoPurpose(targetPurpose.slice(0, purpIdx));
        } else {
          clearInterval(interval);
          setCoFillStep(2); // done filling
        }
      }, 20);

      return () => clearInterval(interval);
    }
  }, [screen, coFillStep]);

  if (!isOpen) return null;

  // Handle send message
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    const lower = chatInput.toLowerCase();
    if (lower.includes('разрыв') || lower.includes('касс') || lower.includes('прогноз')) {
      setScreen('DOC_PERIOD');
    } else if (lower.includes('справк') || lower.includes('оборот') || lower.includes('аренд') || lower.includes('арендодател')) {
      setScreen('DOC_PERIOD');
    } else {
      setScreen('DOC_PERIOD');
    }
    setChatInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="fixed top-16 bottom-0 right-0 z-40 w-full sm:w-[410px] bg-white border-l border-gray-200 shadow-xl flex flex-col font-sans select-none overflow-hidden">
      
      {/* 1. HEADER (Styled identically to screenshots) */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 shrink-0 bg-white z-10" id="chat-header">
        <div className="flex items-center gap-3">
          {/* Circular portrait of the role-matched assistant */}
          <div className="relative w-10 h-10 rounded-xl bg-[#008064] shadow-sm overflow-hidden shrink-0">
            <img
              src={assistantPortrait}
              alt={`Ассистент ${assistantName}`}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: '50% 16%' }}
            />
          </div>
          <div className="text-left">
            <h3 className="font-extrabold text-sm text-gray-800 tracking-wide font-sans">Ассистент {assistantName}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping" />
              <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider">Онлайн</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {screen !== 'GREETING' && (
            <button 
              onClick={() => setScreen('GREETING')}
              className="p-1 px-2 hover:bg-gray-100 text-gray-500 hover:text-gray-800 rounded-lg transition-all focus:outline-none flex items-center gap-1 text-[11px] font-bold cursor-pointer"
              title="На главную"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.2]" />
              <span>Главная</span>
            </button>
          )}
          <button className="p-1.5 hover:bg-gray-100 text-gray-400 hover:text-gray-600 rounded-lg transition-colors focus:outline-none">
            <MoreHorizontal className="w-5 h-5" />
          </button>
          <button 
            onClick={onClose}
            className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors focus:outline-none"
            title="Закрыть"
          >
            <X className="w-5 h-5 stroke-[2.2]" />
          </button>
        </div>
      </div>

      {/* 2. CHAT STREAM WORKSPACE */}
      <div className="flex-1 overflow-y-auto bg-[#F7F9FB] px-4.5 py-4 space-y-4 no-scrollbar">
        <AnimatePresence mode="wait">
          
          {/* ==================== A: GREETING SCREEN (Image 1 replica) ==================== */}
          {screen === 'GREETING' && (
            <motion.div
              key="greeting"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.2 }}
              className="space-y-5"
            >
              {/* Alexandra Corporate Portrait Banner */}
              <div className="relative rounded-[22px] overflow-hidden bg-gradient-to-b from-teal-50 to-teal-100/40 border border-teal-100/70 shadow-3xs" id="chat-greeting-main-banner">
                <img
                  src={assistantPortrait}
                  alt={`Ассистент ${assistantName}`}
                  className="w-full h-42 object-cover scale-102 hover:scale-105 transition-transform duration-700"
                  style={{ objectPosition: '50% 22%' }}
                  referrerPolicy="no-referrer"
                />
                {/* Soft gradient bottom fill overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
              </div>

              {/* Title Greeting Header */}
              <div className="text-left px-1 space-y-1.5" id="chat-greeting-welcome-title">
                <h2 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
                  Добрый день, {userFirstName}.
                </h2>
                <h3 className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">
                  Чем я могу помочь?
                </h3>
              </div>

              {/* Grid 3x2 Popular Queries Section */}
              <div className="space-y-2.5" id="chat-popular-intentions-block">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block ml-1 text-left">
                  Популярные запросы
                </span>
                
                <div className="grid grid-cols-3 gap-2.5">
                  {/* Item 1: Поиск по системе */}
                  <div
                    onClick={() => setScreen('KNOWLEDGE')}
                    className="bg-white border border-gray-100 hover:border-[#008064]/30 hover:shadow-2xs p-3 px-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative min-h-[95px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-[#008064] flex items-center justify-center mb-1.5">
                      <Search className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-none group-hover:text-[#008064] transition-colors">Поиск</span>
                    <span className="text-[9px] text-gray-400 font-medium mt-0.5">по системе</span>
                  </div>

                  {/* Item 2: База знаний */}
                  <div
                    onClick={() => setScreen('KNOWLEDGE')}
                    className="bg-white border border-gray-100 hover:border-[#008064]/30 hover:shadow-2xs p-3 px-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative min-h-[95px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                      <BookOpen className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-none group-hover:text-blue-600 transition-colors">База</span>
                    <span className="text-[9px] text-gray-400 font-medium mt-0.5">знаний</span>
                  </div>

                  {/* Item 3: Сервисы банка */}
                  <div
                    onClick={() => setScreen('SERVICES')}
                    className="bg-white border border-gray-100 hover:border-[#008064]/30 hover:shadow-2xs p-3 px-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative min-h-[95px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center mb-1.5">
                      <Briefcase className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-none group-hover:text-purple-600 transition-colors">Сервисы</span>
                    <span className="text-[9px] text-gray-400 font-medium mt-0.5">банка</span>
                  </div>

                  {/* Item 4: Консультации */}
                  <div
                    onClick={() => setScreen('CONSULT')}
                    className="bg-white border border-gray-100 hover:border-[#008064]/30 hover:shadow-2xs p-3 px-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative min-h-[95px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center mb-1.5">
                      <MessageCircle className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-none group-hover:text-orange-500 transition-colors">Консультации</span>
                    <span className="text-[9px] text-gray-400 font-medium mt-0.5">вопросы</span>
                  </div>

                  {/* Item 5: Обучение */}
                  <div
                    onClick={() => setScreen('LEARNING')}
                    className="bg-white border border-gray-100 hover:border-[#008064]/30 hover:shadow-2xs p-3 px-2 rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 group relative min-h-[95px]"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                      <GraduationCap className="w-4 h-4 stroke-[2]" />
                    </div>
                    <span className="text-[11.5px] font-extrabold text-gray-800 leading-none group-hover:text-emerald-600 transition-colors">Обучение</span>
                    <span className="text-[9px] text-gray-400 font-medium mt-0.5">процессам</span>
                  </div>

                </div>
              </div>

              {/* Subsection: СПЕЦИАЛЬНО ДЛЯ ВАС */}
              <div className="space-y-2 pt-1" id="chat-personalized-blocks">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block ml-1 text-left">
                  Специально для вас
                </span>
                <div className="space-y-2">
                  <div
                    onClick={() => setScreen('LEARNING')}
                    className="bg-white border border-gray-100 hover:border-gray-200 p-4 py-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-3xs"
                  >
                    <span className="text-xs font-black text-gray-800 text-left">Пройти обучающий модуль</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>

                  <div
                    onClick={() => setScreen('DOC_PERIOD')}
                    className="bg-white border border-gray-100 hover:border-gray-200 p-4 py-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-3xs"
                  >
                    <span className="text-xs font-black text-gray-800 text-left">Сформировать справку об оборотах</span>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                </div>
              </div>

            </motion.div>
          )}

          {/* ==================== B: DOC_PERIOD SCREEN (Image 5 replica) ==================== */}
          {screen === 'DOC_PERIOD' && (
            <motion.div
              key="doc_period"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* Message User bubble */}
              <div className="flex justify-end">
                <div className="bg-[#008064] text-white text-xs font-bold px-4 py-3 rounded-2xl rounded-tr-none max-w-[85%] leading-relaxed shadow-xs text-left">
                  Арендодатель просит подтвердить обороты
                </div>
              </div>

              {/* Message Assistant response */}
              <div className="flex items-start gap-2.5">
                {/* Small circular logo */}
                <div className="w-7 h-7 rounded-lg bg-[#008064] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-3xs text-[10px] font-black">
                  А
                </div>
                <div className="bg-white border border-gray-100 text-xs font-bold text-gray-800 px-4 py-3.5 rounded-2xl rounded-tl-none max-w-[85%] leading-relaxed shadow-3xs text-left">
                  Понял — нужна справка для арендодателя. Обычно за 6-12 месяцев. По счету BY20...3421:
                </div>
              </div>

              {/* Choice Choice cards (Image 5) */}
              <div className="space-y-2.5 max-w-[85%] ml-9.5">
                {/* 6 months query card */}
                <button 
                  onClick={() => {
                    setScreen('DOC_FORMAT');
                  }}
                  className="w-full bg-white hover:bg-gray-50 border border-gray-150 p-4 rounded-2xl transition-all shadow-3xs text-left relative focus:outline-none cursor-pointer"
                >
                  <span className="text-[10px] text-gray-400 font-extrabold uppercase block tracking-wider">За 6 месяцев</span>
                  <span className="text-base font-black text-gray-850 font-sans mt-1.5 block">284 600,00 BYN</span>
                </button>

                {/* 12 months recommended card */}
                <button 
                  onClick={() => setScreen('DOC_FORMAT')}
                  className="w-full bg-white border-2 border-[#128e8b] p-4 rounded-2xl text-left relative shadow-xs hover:shadow-sm transition-all focus:outline-none cursor-pointer"
                >
                  {/* Recommended badge */}
                  <span className="absolute -top-2.5 right-4 bg-[#128e8b] text-white font-black text-[9px] px-2 py-0.5 rounded uppercase tracking-wider">
                    Рекомендуем
                  </span>
                  
                  <span className="text-[10px] text-[#128e8b] font-extrabold uppercase block tracking-wider">За 12 месяцев</span>
                  <span className="text-base font-black text-[#128e8b] font-sans mt-1.5 block">531 200,00 BYN</span>
                </button>

                {/* Additional selector link */}
                <button 
                  onClick={() => {
                    alert('Прочие периоды: выберите произвольную календарную дату.');
                  }}
                  className="w-full text-center text-[11px] font-black text-[#128e8b] hover:text-[#0f6c69] py-1 focus:outline-none cursor-pointer hover:underline"
                >
                  Выбрать другой период
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== C: DOC_FORMAT SCREEN (Image 3 replica) ==================== */}
          {screen === 'DOC_FORMAT' && (
            <motion.div
              key="doc_format"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              {/* User message display bubble */}
              <div className="flex justify-end">
                <div className="bg-[#008064] text-white text-xs font-bold px-4 py-3 rounded-2xl rounded-tr-none max-w-[85%] leading-relaxed shadow-xs">
                  За 12 месяцев
                </div>
              </div>

              {/* Assistant response */}
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#008064] flex items-center justify-center text-white shrink-0 mt-0.5 text-[10px] font-black">
                  А
                </div>
                <div className="bg-white border border-gray-100 text-xs font-bold text-gray-800 px-4 py-3.5 rounded-2xl rounded-tl-none max-w-[85%] leading-relaxed shadow-3xs text-left">
                  Отлично. В каком виде нужна справка?
                </div>
              </div>

              {/* Blue info callout alert block */}
              <div className="border border-blue-100 bg-[#ebf5ff] p-4 rounded-2xl flex gap-3 text-xs shadow-3xs text-left max-w-[85%] ml-9.5">
                <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5 stroke-[2]" />
                <p className="text-blue-900 font-semibold leading-relaxed">
                  Большинство арендодателей принимают PDF с ЭЦП — это юридически значимо
                </p>
              </div>

              {/* List of Custom Radio checkboxes */}
              <div className="space-y-2.5 max-w-[85%] ml-9.5">
                {/* 1. Recommended PDF with e-sign */}
                <label 
                  onClick={() => setSelectedFormat('pdf-sign')}
                  className={`flex items-center justify-between p-4 rounded-2xl border cursor-pointer hover:border-[#128e8b] transition-all bg-white shadow-3xs ${selectedFormat === 'pdf-sign' ? 'border-[#128e8b]' : 'border-gray-200'}`}
                >
                  <div className="flex items-center gap-3 select-none">
                    <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center">
                      {selectedFormat === 'pdf-sign' && <div className="w-2.5 h-2.5 bg-[#128e8b] rounded-full" />}
                    </div>
                    <span className="text-xs font-extrabold text-gray-800 text-left">PDF с электронной подписью</span>
                  </div>
                  <span className="bg-[#ebfbf3] text-[#0f6f57] text-[8px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider">
                    Рекомендуем
                  </span>
                </label>

                {/* 2. PDF for printing */}
                <label 
                  onClick={() => setSelectedFormat('pdf-print')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer hover:border-gray-300 transition-all bg-white shadow-3xs ${selectedFormat === 'pdf-print' ? 'border-[#128e8b]' : 'border-gray-200'}`}
                >
                  <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center select-none">
                    {selectedFormat === 'pdf-print' && <div className="w-2.5 h-2.5 bg-[#128e8b] rounded-full" />}
                  </div>
                  <span className="text-xs font-extrabold text-gray-700 text-left">PDF для печати и заверения</span>
                </label>

                {/* 3. Excel sheet */}
                <label 
                  onClick={() => setSelectedFormat('excel')}
                  className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer hover:border-gray-300 transition-all bg-white shadow-3xs ${selectedFormat === 'excel' ? 'border-[#128e8b]' : 'border-gray-200'}`}
                >
                  <div className="w-4 h-4 rounded-full border border-gray-300 flex items-center justify-center select-none">
                    {selectedFormat === 'excel' && <div className="w-2.5 h-2.5 bg-[#128e8b] rounded-full" />}
                  </div>
                  <span className="text-xs font-extrabold text-gray-700 text-left">Excel — только цифры</span>
                </label>
              </div>

              {/* Form trigger layout block */}
              <div className="pt-2 text-center space-y-3 max-w-[85%] ml-9.5">
                <span className="text-[10.5px] text-gray-400 font-bold block">
                  Справка будет готова через ~40 секунд
                </span>
                <button 
                  onClick={() => setScreen('DOC_PROGRESS')}
                  className="w-full bg-[#128e8b] hover:bg-[#0f6c69] text-white py-3.5 px-4 rounded-[18px] font-black text-center text-xs uppercase tracking-wider transition-all shadow-md focus:outline-none cursor-pointer"
                >
                  Сформировать справку
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== D: DOC_PROGRESS SCREEN (Image 4 replica) ==================== */}
          {screen === 'DOC_PROGRESS' && (
            <motion.div
              key="doc_progress"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Title */}
              <div className="text-left space-y-2">
                <h4 className="text-[13.5px] font-black text-gray-800 leading-snug">
                  Формирую справку об оборотах за 12 месяцев...
                </h4>
                {/* Horizontal Progress indicators */}
                <div className="w-full bg-gray-150 rounded-full h-2 overflow-hidden shadow-3xs">
                  <div 
                    style={{ width: `${progressVal}%` }}
                    className="bg-[#128e8b] h-full rounded-full transition-all duration-300"
                  />
                </div>
              </div>

              {/* Progress checklist list */}
              <div className="bg-white border border-gray-100 rounded-2xl p-4.5 space-y-3.5 shadow-3xs text-left">
                {/* 1. Request accepted */}
                <div className="flex items-center text-xs font-extrabold text-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Запрос принят</span>
                  </div>
                </div>

                {/* 2. Analysis completed */}
                <div className="flex items-center text-xs font-extrabold text-gray-800">
                  <div className="flex items-center gap-3">
                    <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Анализ данных</span>
                  </div>
                </div>

                {/* 3. Generating in progress with spinner */}
                <div className="flex items-center text-xs font-extrabold text-gray-800">
                  <div className="flex items-center gap-3">
                    {progressVal < 70 ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-150 shrink-0">
                        <Loader2 className="w-3 h-3 text-blue-600 stroke-[2.5] animate-spin" />
                      </div>
                    ) : (
                      <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    <span className={progressVal < 70 ? 'text-gray-800' : 'text-gray-850'}>Формирование документа</span>
                  </div>
                </div>

                {/* 4. Signature pending */}
                <div className="flex items-center text-xs font-extrabold text-gray-400">
                  <div className="flex items-center gap-3">
                    {progressVal < 98 ? (
                      <div className="w-5.5 h-5.5 rounded-full bg-gray-50 flex items-center justify-center border border-gray-200 shrink-0">
                        <div className="w-2 h-2 rounded-full bg-gray-300" />
                      </div>
                    ) : (
                      <div className="w-5.5 h-5.5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                    <span className={progressVal >= 98 ? 'text-gray-800 font-extrabold' : ''}>Подпись ЭЦП</span>
                  </div>
                </div>
              </div>

              {/* Tips block (KSTATI card with rise info tag) */}
              <div className="border border-blue-100 bg-[#ebf5ff] p-4 rounded-2xl flex gap-3 text-xs shadow-3xs text-left">
                <div className="w-5 h-5 text-blue-600 shrink-0 mt-0.5">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <h5 className="font-extrabold text-[9.5px] text-blue-800 uppercase tracking-wider">КСТАТИ</h5>
                  <p className="text-blue-900 font-semibold leading-relaxed">
                    Ваш оборот вырос на 23%. Это хороший аргумент для переговоров.
                  </p>
                </div>
              </div>

              {/* Skip wait btn */}
              <div className="pt-2">
                <button 
                  onClick={() => setScreen('DOC_READY')}
                  className="w-full bg-[#f8fafc] text-gray-500 font-bold border border-gray-200 hover:bg-white hover:text-gray-800 text-[11px] py-3 rounded-xl transition cursor-pointer"
                >
                  Уведомить, когда готово, и выйти
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== E: DOC_READY SCREEN (Image 2 replica) ==================== */}
          {screen === 'DOC_READY' && (
            <motion.div
              key="doc_ready"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Success Indicator */}
              <div className="text-center py-2 space-y-1.5">
                <div className="w-11 h-11 bg-[#ebfbf3] text-[#008064] rounded-full flex items-center justify-center mx-auto shadow-sm border border-[#c4f2db]">
                  <Check className="w-6.5 h-6.5 stroke-[3]" />
                </div>
                <h3 className="font-black text-base text-gray-850 tracking-wide font-sans">Справка готова</h3>
              </div>

              {/* Ready Document representation */}
              <div className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center gap-3.5 shadow-3xs text-left">
                <div className="p-3 bg-red-50 text-red-500 rounded-xl shrink-0">
                  <FileText className="w-6 h-6 stroke-[2]" />
                </div>
                <div className="leading-snug min-w-0 flex-1">
                  <h5 className="font-extrabold text-[12.5px] text-gray-800 truncate">Справка об оборотах ООО СтройКомпл</h5>
                  <p className="text-[10px] text-gray-400 font-bold mt-1">Сегодня, 14:30 • 124 КБ • ЭЦП</p>
                </div>
              </div>

              {/* Side by side triple quick action keys */}
              <div className="grid grid-cols-3 gap-2.5">
                <button 
                  onClick={() => alert('Началось скачивание подписанного PDF на устройство...')}
                  className="bg-white border border-gray-150 hover:bg-gray-50 hover:border-gray-250 py-3.5 rounded-xl flex flex-col items-center justify-center text-center transition focus:outline-none cursor-pointer"
                >
                  <Download className="w-4.5 h-4.5 text-gray-500 mb-1" />
                  <span className="text-[10px] font-black text-gray-700">Скачать</span>
                </button>
                <button 
                  onClick={() => alert('Справка сформирована и отправлена на электронную почту арендодателя.')}
                  className="bg-white border border-gray-150 hover:bg-gray-50 hover:border-gray-250 py-3.5 rounded-xl flex flex-col items-center justify-center text-center transition focus:outline-none cursor-pointer"
                >
                  <Send className="w-4.5 h-4.5 text-gray-500 mb-1" />
                  <span className="text-[10px] font-black text-gray-700">Отправить</span>
                </button>
                <button 
                  onClick={() => alert('Публичная ссылка на заверенную справку скопирована в буфер обмена.')}
                  className="bg-white border border-gray-150 hover:bg-gray-50 hover:border-gray-250 py-3.5 rounded-xl flex flex-col items-center justify-center text-center transition focus:outline-none cursor-pointer"
                >
                  <Share2 className="w-4.5 h-4.5 text-gray-500 mb-1" />
                  <span className="text-[10px] font-black text-gray-700">Поделиться</span>
                </button>
              </div>

              {/* Suggestion promotion box */}
              <div className="border border-blue-100 bg-[#ebf5ff] p-4.5 rounded-2xl space-y-3 shadow-3xs text-left">
                <p className="text-gray-800 font-extrabold text-[12px] leading-snug">
                  Также могу подготовить справку об отсутствии задолженности
                </p>
                <div className="flex gap-2.5 font-black">
                  <button 
                    onClick={() => setScreen('LEASE_PACKAGE')}
                    className="flex-1 bg-[#128e8b] hover:bg-[#0f6c69] text-white text-[11px] py-2 rounded-lg text-center transition-all focus:outline-none cursor-pointer"
                  >
                    Подготовить
                  </button>
                  <button 
                    onClick={() => setScreen('GREETING')}
                    className="bg-white border border-gray-250 text-gray-700 text-[11px] py-1.8 px-3.5 rounded-lg text-center hover:bg-gray-50 transition-all focus:outline-none cursor-pointer"
                  >
                    Не нужно
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ==================== F: LEASE_PACKAGE SCREEN (Image 6 replica) ==================== */}
          {screen === 'LEASE_PACKAGE' && (
            <motion.div
              key="lease_package"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 text-left"
            >
              {/* Content heading */}
              <div className="space-y-2">
                <h3 className="font-extrabold text-[13px] text-gray-850 leading-relaxed font-sans">
                  Вижу, что договор аренды заканчивается. Могу сразу подготовить полный пакет документов для арендодателя:
                </h3>
              </div>

              {/* Three items check list frame */}
              <div className="bg-white border border-gray-150 rounded-2xl p-4.5 space-y-3.5 shadow-3xs">
                {/* 1 */}
                <label className="flex items-center gap-3 text-xs font-black text-gray-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={leaseChecks.turnover}
                    onChange={(e) => setLeaseChecks({ ...leaseChecks, turnover: e.target.checked })}
                    className="w-4.5 h-4.5 text-emerald-600 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                  <span>Справка об оборотах</span>
                </label>

                {/* 2 */}
                <label className="flex items-center gap-3 text-xs font-black text-gray-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={leaseChecks.noDebt}
                    onChange={(e) => setLeaseChecks({ ...leaseChecks, noDebt: e.target.checked })}
                    className="w-4.5 h-4.5 text-emerald-600 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                  <span>Справка об отсутствии задолженности</span>
                </label>

                {/* 3 */}
                <label className="flex items-center gap-3 text-xs font-black text-gray-700 cursor-pointer select-none">
                  <input 
                    type="checkbox" 
                    checked={leaseChecks.statement}
                    onChange={(e) => setLeaseChecks({ ...leaseChecks, statement: e.target.checked })}
                    className="w-4.5 h-4.5 text-emerald-600 accent-emerald-500 rounded cursor-pointer shrink-0"
                  />
                  <span>Выписка по счету</span>
                </label>
              </div>

              {/* Stacked big actions */}
              <div className="space-y-2 pt-1 font-black">
                <button
                  type="button"
                  onClick={() => {
                    const count = Object.values(leaseChecks).filter(Boolean).length;
                    alert(`✓ Успешно запущена подготовка выбранного пакета (${count} док.) в фоновом режиме.`);
                    setScreen('DOC_PROGRESS');
                  }}
                  className="w-full bg-[#128e8b] hover:bg-[#0f6c69] text-white py-3 px-4 rounded-xl text-center text-xs font-black tracking-wider transition-all cursor-pointer"
                >
                  Подготовить пакет
                </button>
                <button
                  type="button"
                  onClick={() => setScreen('GREETING')}
                  className="w-full bg-white hover:bg-gray-50 text-gray-500 border border-gray-200 py-2.5 px-4 rounded-xl text-center text-xs font-bold transition-all cursor-pointer"
                >
                  Не сейчас
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== G: CO_FILL_DEMO SCREEN (Autofill interactive preview) ==================== */}
          {screen === 'CO_FILL_DEMO' && (
            <motion.div
              key="co_fill_demo"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4 text-left font-sans"
            >
              {/* Header card with status */}
              <div className="bg-gradient-to-r from-[#008064] to-[#128e8b] text-white p-4 rounded-2xl relative overflow-hidden shadow-xs">
                <div className="flex items-center gap-3 relative z-10">
                  <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
                  </div>
                  <div>
                    <h4 className="text-[9.5px] font-black tracking-wider uppercase text-[#c4f2db]">ИИ-Помощник {assistantName}</h4>
                    <p className="text-xs text-white font-bold mt-0.5 leading-none">
                      {coFillStep === 0 && "Анализирую входящий счет на оплату..."}
                      {coFillStep === 1 && "Формирую умный черновик перевода..."}
                      {coFillStep === 2 && "Черновик готов к импорту!"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Speech bubble */}
              <div className="bg-[#ebfbf3] border border-[#c4f2db] p-3.5 rounded-2xl relative text-left">
                <p className="text-xs font-semibold text-gray-800 leading-relaxed">
                  {coFillStep === 0 && "Изучаю прикрепленный PDF-документ... Распознаю реквизиты ООО «ПорталДевелопмент» и общую сумму."}
                  {coFillStep === 1 && "Речь идет о регулярном счете за аренду офиса. Сейчас я разложу все обнаруженные реквизиты по соответствующим полям..."}
                  {coFillStep === 2 && "Все реквизиты счета успешно считаны! Нажмите кнопку импорта ниже, чтобы автоматически заполнить форму перевода."}
                </p>
              </div>

              {/* Dynamic live filling preview card */}
              <div className="bg-white border-2 border-emerald-500 rounded-2xl p-4.5 space-y-3.5 shadow-md relative overflow-hidden">
                <div className="absolute -right-6 -top-6 w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 opacity-65">
                  <Sparkles className="w-5 h-5 translate-x-[-4px] translate-y-[4px]" />
                </div>

                <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
                  <div>
                    <span className="text-[9.5px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                      {coFillStep < 2 ? "✍ Идет интерактивный ввод" : "✓ Документ сформирован"}
                    </span>
                    <h5 className="text-xs font-black text-gray-800 mt-2 font-mono">ПЛАТЕЖНОЕ ПОРУЧЕНИЕ</h5>
                  </div>
                  <span className="text-sm font-black text-emerald-600 font-mono">
                    {coAmount ? `${coAmount} BYN` : "..."}
                  </span>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <p className="text-[10px] text-gray-400 font-bold leading-none uppercase">Плательщик</p>
                    <p className="font-extrabold text-gray-800 text-xs mt-1">ОДО «СтильСтройПром» (BY51 BPSB ...)</p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-400 font-bold leading-none uppercase">Получатель (Бенефициар)</p>
                    <p className={`font-black text-xs text-gray-900 mt-1 p-1 rounded transition-all duration-300 ${coFillStep === 1 && coName && !coIban ? 'bg-emerald-50 border-emerald-300 border-l-2' : ''}`}>
                      {coName || <span className="text-gray-300 italic font-medium">Ожидание...</span>}
                    </p>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-400 font-bold leading-none uppercase">Счет получателя (IBAN)</p>
                    <p className={`font-mono text-xs text-gray-800 mt-1 p-1 rounded transition-all duration-300 ${coFillStep === 1 && coIban && !coUnp ? 'bg-emerald-50 border-emerald-300 border-l-2' : ''}`}>
                      {coIban || <span className="text-gray-300 italic font-medium font-sans">Ожидание...</span>}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold leading-none uppercase">УНП / Налоговый код</p>
                      <p className={`font-mono text-xs text-gray-800 mt-1 p-1 rounded transition-all duration-300 ${coFillStep === 1 && coUnp && !coAmount ? 'bg-emerald-50 border-emerald-300 border-l-2' : ''}`}>
                        {coUnp || <span className="text-gray-300 italic font-medium font-sans">...</span>}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-bold leading-none uppercase">Сумма (BYN)</p>
                      <p className={`font-black text-xs text-gray-950 mt-1 p-1 rounded transition-all duration-300 ${coFillStep === 1 && coAmount && !coPurpose ? 'bg-emerald-50 border-emerald-300 border-l-2' : ''}`}>
                        {coAmount || <span className="text-gray-300 italic font-medium font-sans">...</span>}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-[10px] text-gray-400 font-bold leading-none uppercase">Назначение платежа</p>
                    <p className={`font-medium text-gray-700 text-xs mt-1 p-1 italic leading-relaxed rounded transition-all duration-300 ${coFillStep === 1 && coPurpose ? 'bg-emerald-50 border-emerald-300 border-l-2' : ''}`}>
                      {coPurpose || <span className="text-gray-300 italic font-medium">Ожидание назначения...</span>}
                    </p>
                  </div>
                </div>
              </div>

              {/* Progress and control buttons */}
              <div className="space-y-2 pt-2">
                {coFillStep < 2 ? (
                  <div className="text-center">
                    <span className="text-[10px] text-gray-400 font-bold uppercase animate-pulse flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin text-emerald-600" />
                      {assistantName} считывает счет...
                    </span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (onTriggerAutofillInCabinet) {
                          onTriggerAutofillInCabinet('rent');
                        }
                        onClose();
                        alert('✓ Интелектуальные реквизиты ООО «ПорталДевелопмент» импортированы в СберБизнес! Соответствующий бланк оплаты открыт.');
                      }}
                      className="w-full bg-[#008064] hover:bg-[#006c54] text-white py-3 px-4 rounded-xl font-extrabold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4 text-white fill-white animate-pulse" />
                      <span>Импортировать в Сбербанк Бизнес</span>
                    </button>
                    <p className="text-[9.5px] text-center text-gray-450 font-medium px-2 leading-tight">
                      Данная транзакция автоматически сохранится как черновик оплаты для вашей подписи.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setScreen('GREETING')}
                  className="w-full bg-white hover:bg-gray-150 text-gray-600 border border-gray-200 py-2.5 px-4 rounded-xl text-center text-xs font-bold transition-all cursor-pointer"
                >
                  Вернуться в главное меню
                </button>
              </div>
            </motion.div>
          )}

          {/* ==================== SERVICES: Сервисы банка ==================== */}
          {screen === 'SERVICES' && (
            <motion.div
              key="services"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <h4 className="text-sm font-black text-gray-900 px-1">Сервисы банка</h4>

              <div className="flex gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#008064] flex items-center justify-center text-white shrink-0 mt-0.5 shadow-3xs">
                  <Sparkles className="w-3.5 h-3.5 fill-white/30" />
                </div>
                <div className="bg-white border border-gray-100 text-xs font-bold text-gray-800 px-4 py-3.5 rounded-2xl rounded-tl-none leading-relaxed shadow-3xs text-left">
                  Я могу проконсультировать вас по любому корпоративному продукту банка. Какой сервис вас интересует?
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { icon: Percent, label: 'Кредитование', color: 'text-emerald-600 bg-emerald-50', msg: 'Программа кредитования «Развитие»: ставка от 7% годовых. Ваша компания предварительно одобрена.' },
                  { icon: Wallet, label: 'Зарплатный проект', color: 'text-[#008064] bg-emerald-50', msg: 'Подключение зарплатного проекта: бесплатный выпуск карт сотрудникам, комиссия от 0.1%.' },
                  { icon: CreditCard, label: 'Эквайринг', color: 'text-blue-600 bg-blue-50', msg: 'Торговый и интернет-эквайринг Сбера. Ставка комиссии от 1.2%.' },
                  { icon: Briefcase, label: 'Корп. карты', color: 'text-purple-600 bg-purple-50', msg: 'Бизнес-карты Visa/MasterCard с настраиваемыми лимитами и доверенностями.' },
                ].map((s) => (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => alert(s.msg)}
                    className="bg-white border border-gray-100 hover:border-[#008064]/30 hover:shadow-2xs p-4 rounded-2xl flex flex-col items-center justify-center gap-2 text-center cursor-pointer transition-all min-h-[90px] focus:outline-none"
                  >
                    <span className={`w-9 h-9 rounded-full flex items-center justify-center ${s.color}`}>
                      <s.icon className="w-4.5 h-4.5 stroke-[2]" />
                    </span>
                    <span className="text-[11px] font-extrabold text-gray-800 leading-tight">{s.label}</span>
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setScreen('CO_FILL_DEMO')}
                className="w-full bg-white border border-gray-100 hover:border-gray-200 p-4 py-3 rounded-2xl flex items-center justify-between cursor-pointer transition-all shadow-3xs"
              >
                <span className="flex items-center gap-2.5 text-xs font-black text-gray-800 text-left">
                  <Receipt className="w-4 h-4 text-[#008064]" />
                  Сканировать счёт и заполнить платёж
                </span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </motion.div>
          )}

          {/* ==================== KNOWLEDGE: База знаний ==================== */}
          {screen === 'KNOWLEDGE' && (
            <motion.div
              key="knowledge"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <h4 className="text-sm font-black text-gray-900 px-1">База знаний</h4>

              {/* Search field (visual) */}
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl bg-[#f8fafc] px-3 py-2.5">
                <Search className="w-4 h-4 text-gray-400 shrink-0" />
                <input
                  type="text"
                  placeholder="Поиск по базе знаний..."
                  className="flex-1 bg-transparent border-none text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none"
                />
              </div>

              {/* Filter chips */}
              <div className="flex flex-wrap gap-2">
                {['Все', 'Регламенты', 'Инструкции', 'FAQ'].map((c, i) => (
                  <button
                    key={c}
                    type="button"
                    className={`px-3 py-1 rounded-full text-[11px] font-bold transition-colors focus:outline-none ${
                      i === 0 ? 'bg-[#008064] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Document list */}
              <div className="space-y-2.5">
                {[
                  { title: 'Регламент работы с контрагентами v2.0', meta: 'PDF · 2.4 MB', tag: 'готово', tagColor: 'bg-emerald-50 text-emerald-700' },
                  { title: 'Инструкция по ИБ для новых сотрудников', meta: 'PDF · 1.8 MB', tag: '', tagColor: '' },
                  { title: 'FAQ: Настройка прав доступа в системе', meta: 'Ссылка на портал', tag: '', tagColor: '' },
                ].map((d) => (
                  <button
                    key={d.title}
                    type="button"
                    onClick={() => alert(`Открываю документ: «${d.title}»`)}
                    className="w-full bg-white border border-gray-100 hover:border-gray-200 p-3.5 rounded-2xl flex items-start gap-3 cursor-pointer transition-all shadow-3xs text-left"
                  >
                    <span className="w-9 h-9 rounded-lg bg-rose-50 text-rose-500 flex items-center justify-center shrink-0">
                      <FileText className="w-4.5 h-4.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-gray-800 leading-snug">{d.title}</span>
                        {d.tag && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${d.tagColor}`}>{d.tag}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-400 font-semibold mt-0.5 block">{d.meta}</span>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* ==================== LEARNING: Обучение ==================== */}
          {screen === 'LEARNING' && (
            <motion.div
              key="learning"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <h4 className="text-sm font-black text-gray-900 px-1">Обучение</h4>

              {/* Progress card */}
              <div className="rounded-2xl bg-gradient-to-br from-[#0b3d2e] to-[#0f5740] p-5 text-white shadow-sm">
                <div className="flex items-end justify-between mb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/80">Ваш прогресс</span>
                  <span className="text-2xl font-black leading-none">20%</span>
                </div>
                <div className="w-full bg-white/15 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-400 h-full rounded-full" style={{ width: '20%' }} />
                </div>
                <span className="text-[10px] text-emerald-200/70 font-semibold mt-2 block">1 из 5 модулей завершён</span>
              </div>

              {/* Modules */}
              <div className="space-y-2">
                <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block ml-1">Модули</span>
                {[
                  { title: 'Введение в ИИ-ассистента', time: '15 мин', status: 'Завершено', icon: Check, tone: 'done' },
                  { title: 'Эффективный поиск', time: '20 мин', status: 'В процессе', icon: PlayCircle, tone: 'active' },
                  { title: 'Составление запросов', time: '25 мин', status: 'Новый', icon: BookOpen, tone: 'new' },
                  { title: 'Ролевые помощники', time: '30 мин', status: 'Новый', icon: Users, tone: 'new' },
                  { title: 'Продвинутые команды', time: '35 мин', status: 'Скоро', icon: Clock, tone: 'soon' },
                ].map((m) => (
                  <button
                    key={m.title}
                    type="button"
                    disabled={m.tone === 'soon'}
                    onClick={() => alert(`Модуль «${m.title}» — ${m.status}.`)}
                    className={`w-full p-3.5 rounded-2xl flex items-center gap-3 transition-all shadow-3xs text-left border ${
                      m.tone === 'active'
                        ? 'bg-emerald-50/50 border-emerald-200'
                        : m.tone === 'soon'
                        ? 'bg-gray-50 border-gray-100 opacity-60 cursor-not-allowed'
                        : 'bg-white border-gray-100 hover:border-gray-200 cursor-pointer'
                    }`}
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                      m.tone === 'done' ? 'bg-emerald-100 text-emerald-700'
                      : m.tone === 'active' ? 'bg-[#008064] text-white'
                      : 'bg-gray-100 text-gray-400'
                    }`}>
                      <m.icon className="w-4.5 h-4.5" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-800 block leading-snug">{m.title}</span>
                      <span className="text-[10px] text-gray-400 font-semibold mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3" /> {m.time}
                      </span>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                      m.tone === 'done' ? 'bg-emerald-50 text-emerald-700'
                      : m.tone === 'active' ? 'bg-emerald-100 text-emerald-800'
                      : m.tone === 'soon' ? 'bg-gray-100 text-gray-400'
                      : 'bg-blue-50 text-blue-600'
                    }`}>
                      {m.status}
                    </span>
                  </button>
                ))}
              </div>

            </motion.div>
          )}

          {/* ==================== CONSULT: Консультации ==================== */}
          {screen === 'CONSULT' && (
            <motion.div
              key="consult"
              initial={{ opacity: 0, x: 15 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -15 }}
              transition={{ duration: 0.18 }}
              className="space-y-4"
            >
              <div className="px-1">
                <h4 className="text-sm font-black text-gray-900">Консультации</h4>
                <p className="text-[11px] text-gray-400 font-medium mt-0.5">Получите ответ на профессиональный вопрос</p>
              </div>

              <span className="text-[10px] text-gray-400 font-extrabold uppercase tracking-widest block ml-1">Категории</span>

              <div className="space-y-2.5">
                {[
                  { icon: Network, color: 'text-emerald-600 bg-emerald-50', title: 'Бизнес-процессы', desc: 'Как оптимизировать рабочие процессы?' },
                  { icon: FileText, color: 'text-blue-600 bg-blue-50', title: 'Документооборот', desc: 'Как правильно оформить служебную записку?' },
                  { icon: Globe, color: 'text-purple-600 bg-purple-50', title: 'Цифровизация', desc: 'Какие инструменты автоматизации подойдут?' },
                  { icon: Users, color: 'text-orange-500 bg-orange-50', title: 'Командная работа', desc: 'Как улучшить коммуникацию в команде?' },
                ].map((c) => (
                  <button
                    key={c.title}
                    type="button"
                    onClick={() => setChatInput(`Консультация: ${c.title}. `)}
                    className="w-full bg-white border border-gray-100 hover:border-gray-200 p-3.5 rounded-2xl flex items-center gap-3 cursor-pointer transition-all shadow-3xs text-left"
                  >
                    <span className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${c.color}`}>
                      <c.icon className="w-4.5 h-4.5 stroke-[2]" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-800 block leading-snug">{c.title}</span>
                      <span className="text-[10px] text-gray-400 font-medium mt-0.5 block leading-snug">{c.desc}</span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>

      {/* 3. CORE BOTTOM PROMPT MESSAGE ENTRY BAR */}
      <div className="border-t border-gray-100 p-4 bg-white shrink-0 shadow-sm z-10" id="chat-input-bar-container">
        <div className="flex items-center gap-2 border border-gray-200 rounded-2xl bg-[#f8fafc] px-3.5 py-1.5 focus-within:border-[#008064] focus-within:ring-1 focus-within:ring-[#008064]/5 transition-all">
          <button 
            onClick={() => {
              alert('Загрузка счета (PDF, PNG, JPEG, Excel) для автораспознавания.');
            }}
            className="p-1 text-gray-450 hover:text-gray-700 transition-colors focus:outline-none shrink-0 cursor-pointer"
            title="Прикрепить файл"
          >
            <Paperclip className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>

          <input 
            type="text" 
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напишите что нужно..."
            className="flex-1 bg-transparent border-none py-1.5 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-0 leading-normal"
          />

          <button 
            onClick={() => alert(`Голосовой ввод запроса к ассистенту ${assistantName}.`)}
            className="p-1 text-gray-450 hover:text-gray-700 transition-colors focus:outline-none shrink-0 cursor-pointer"
            title="Голосовой ввод"
          >
            <Mic className="w-4.5 h-4.5 stroke-[2.2]" />
          </button>

          <button 
            onClick={handleSendMessage}
            className={`p-1.5 rounded-xl transition-all focus:outline-none shrink-0 ${chatInput.trim() ? 'bg-[#008064] text-white hover:bg-[#006c54] cursor-pointer' : 'text-gray-300 pointer-events-none'}`}
            title="Отправить"
          >
            <Send className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
      </div>

    </div>
  );
}
