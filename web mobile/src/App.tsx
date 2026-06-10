import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Menu, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import Footer from './components/Footer';
import Copilot from './components/Copilot';

// Sber Corporate Sub-Views
import MoneyView from './components/MoneyView';
import PaymentsView from './components/PaymentsView';
import StatementView from './components/StatementView';
import PayrollView from './components/PayrollView';
import ProductsView from './components/ProductsView';
import ServicesView from './components/ServicesView';
import OtherView from './components/OtherView';
import SettingsView from './components/SettingsView';
import CreateDocumentModal from './components/CreateDocumentModal';

import { BankAccount, BankDocument, EmployeeSalary } from './types';

export default function App() {
  // Navigation / Tab layout coordinator
  const [activeTab, setActiveTab] = useState<string>('money');
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isCreateDocumentOpen, setIsCreateDocumentOpen] = useState(false);

  // Unread badge states
  const [notificationCount, setNotificationCount] = useState(2);
  const [unreadEmails, setUnreadEmails] = useState(1);
  const [phoneAlertModal, setPhoneAlertModal] = useState(false);
  const [notificationModalOpen, setNotificationModalOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  // Default open on desktop to show off the assistant; closed on mobile so it doesn't cover the whole screen
  const [assistantOpen, setAssistantOpen] = useState(
    () => typeof window !== 'undefined' && window.innerWidth >= 768
  );

  // Core synchronized banking states bootstrapping Screenshot 5 balances + cards exactly
  const [accounts, setAccounts] = useState<BankAccount[]>([
    {
      id: 'BY51 BPSB 3012 2222 2222 2933 2222',
      type: 'Текущий (расчетный) счет',
      label: 'крутой',
      balance: 200.00,
      currency: 'BYN'
    },
    {
      id: 'BY69 BPSB 3012 3333 3333 3933 3333',
      type: 'Карточный счет',
      label: 'Добрый счёт',
      balance: 300.00,
      currency: 'BYN'
    },
    {
      id: 'BY41 BPSB 3012 0000 0000 0978 0000',
      type: 'Текущий (расчетный) счет',
      label: 'заметка',
      balance: 2000.00,
      currency: 'EUR'
    },
    {
      id: 'BY18 BPSB 3012 1111 1111 0643 1111',
      type: 'Текущий (расчетный) счет',
      label: 'рублевый сейф',
      balance: 3000.00,
      currency: 'RUB'
    },
    {
      id: 'BY29 BPSB 3012 5555 5555 0840 5555',
      type: 'Текущий (расчетный) счет',
      label: 'долларовый',
      balance: 0.00,
      currency: 'USD'
    }
  ]);

  const [documents, setDocuments] = useState<BankDocument[]>([
    {
      id: '№ 102',
      date: '05.06.2026',
      type: 'Перевод в BYN',
      counterparty: 'Министерство финансов',
      amount: 150.00,
      currency: 'BYN',
      status: 'Проведен',
      purpose: 'Оплата налоговых сборов за 2 квартал 2026 года согласно годовой декларации'
    },
    {
      id: '№ 95',
      date: '03.06.2026',
      type: 'Покупка валюты',
      counterparty: 'ОАО Сбер Банк',
      amount: 3500.00,
      currency: 'BYN',
      status: 'Проведен',
      purpose: 'Покупка безналичной иностранной валюты по льготному курсу дилера'
    },
    {
      id: '№ 84',
      date: '01.06.2026',
      type: 'Зарплатный проект',
      counterparty: 'Зарплатный реестр (3 сотр.)',
      amount: 3250.00,
      currency: 'BYN',
      status: 'Проведен',
      purpose: 'Выплата заработной платы за май 2026 года согласно договорам найма'
    },
    {
      id: '№ 105',
      date: '05.06.2026',
      type: 'Перевод в BYN',
      counterparty: 'ООО АльфаИнвест',
      amount: 120.00,
      currency: 'BYN',
      status: 'На подписи',
      purpose: 'Оплата аренды офисных помещений по счету №77 от 25.05.2026'
    }
  ]);

  const [employees, setEmployees] = useState<EmployeeSalary[]>([
    {
      id: 'EMP-01',
      fullName: 'Иванов Иван Иванович',
      cardNumber: '**** 1234',
      amount: 1200.00,
      status: 'Готов'
    },
    {
      id: 'EMP-02',
      fullName: 'Петров Петр Петрович',
      cardNumber: '**** 5678',
      amount: 1100.00,
      status: 'Готов'
    },
    {
      id: 'EMP-03',
      fullName: 'Сидоров Сергей Сергеевич',
      cardNumber: '**** 9012',
      amount: 950.00,
      status: 'Готов'
    }
  ]);

  // Translate tab ID to localized screen header title string
  const getSubHeaderTitle = () => {
    switch (activeTab) {
      case 'money': return 'Деньги и события';
      case 'payments': return 'Расчеты';
      case 'statement': return 'Выписка';
      case 'payroll': return 'Зарплата';
      case 'products': return 'Продукты и услуги';
      case 'services': return 'Сервисы';
      case 'other': return 'Прочее';
      case 'settings': return 'Настройки кабинета';
      default: return 'Сбербанк Бизнес';
    }
  };

  const handleOpenPhoneSupport = () => {
    setPhoneAlertModal(true);
  };

  const handleOpenNotifications = () => {
    setNotificationModalOpen(true);
    setNotificationCount(0); // clear count
  };

  const handleOpenMessages = () => {
    setEmailModalOpen(true);
    setUnreadEmails(0); // clear count
  };

  // Quick Action Navigator from RHS buttons
  const handleOpenQuickAction = (actionId: string) => {
    if (actionId === 'loans') {
      setActiveTab('products');
      setTimeout(() => alert('Информация по Кредитам ОАО «Сбер Банк» представлена в подразделе Кредитование!'), 300);
    } else if (actionId === 'corp-cards') {
      setActiveTab('products');
      setTimeout(() => alert('Вы переведены в Консоль корпоративных карт!'), 300);
    } else if (actionId === 'employees') {
      setActiveTab('payroll');
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f6f9] text-[#2c3e50] flex flex-col font-sans relative">
      
      {/* 1. Sber High fidelity Header Top brand strip */}
      <Navbar 
        notificationsCount={notificationCount}
        messagesCount={unreadEmails}
        companyName="Пятая команда"
        onOpenPhoneSupport={handleOpenPhoneSupport}
        onOpenNotifications={handleOpenNotifications}
        onOpenMessages={handleOpenMessages}
        onToggleAssistant={() => setAssistantOpen(prev => !prev)}
        assistantActive={assistantOpen}
      />

      {/* Main workspace envelope */}
      <div className="flex-1 flex flex-col md:flex-row relative">
        
        {/* 2. Vertically centered sidebar left node */}
        <Sidebar 
          activeTab={activeTab}
          onChangeTab={setActiveTab}
          mobileOpen={mobileSidebarOpen}
          setMobileOpen={setMobileSidebarOpen}
        />

        {/* 3. Core content display on RHS */}
        <div className={`flex-1 md:pl-[130px] ${assistantOpen ? 'md:pr-[410px]' : ''} flex flex-col min-w-0 transition-all duration-200`}>
          
          {/* Mobile hamburger menu container trigger */}
          <div className="md:hidden bg-white border-b border-gray-150 px-4 py-2.5 flex items-center justify-between z-10">
            <button 
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 justify-center hover:bg-slate-100 rounded text-gray-550 flex items-center gap-2 text-xs font-bold font-sans focus:outline-none"
            >
              <Menu className="w-5 h-5 text-sber-green" />
              <span>СБЕР МЕНЮ</span>
            </button>
            <span className="text-xs font-black text-gray-800 uppercase tracking-widest">{getSubHeaderTitle()}</span>
          </div>

          {/* Interactive view injection */}
          <main className="flex-1 p-4 md:p-8 max-w-7xl w-full mx-auto select-none outline-none">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
              >
                {activeTab === 'money' && (
                  <MoneyView 
                    accounts={accounts}
                    setAccounts={setAccounts}
                    documents={documents}
                    setDocuments={setDocuments}
                    onCreateDocument={() => setIsCreateDocumentOpen(true)}
                    onOpenQuickAction={handleOpenQuickAction}
                  />
                )}
                {activeTab === 'payments' && (
                  <PaymentsView 
                    accounts={accounts}
                    setAccounts={setAccounts}
                    documents={documents}
                    setDocuments={setDocuments}
                  />
                )}
                {activeTab === 'statement' && (
                  <StatementView 
                    accounts={accounts}
                    documents={documents}
                  />
                )}
                {activeTab === 'payroll' && (
                  <PayrollView 
                    accounts={accounts}
                    setAccounts={setAccounts}
                    documents={documents}
                    setDocuments={setDocuments}
                    employees={employees}
                    setEmployees={setEmployees}
                  />
                )}
                {activeTab === 'products' && (
                  <ProductsView 
                    accounts={accounts}
                    setAccounts={setAccounts}
                  />
                )}
                {activeTab === 'services' && <ServicesView />}
                {activeTab === 'other' && <OtherView />}
                {activeTab === 'settings' && <SettingsView />}
              </motion.div>
            </AnimatePresence>
          </main>

          {/* Sber trademark Footer */}
          <Footer />
        </div>

      </div>

      {/* Floating Chat Support Action widget representing brand green circular help bubble RHS */}
      <div className={`fixed bottom-6 right-6 z-40 select-none ${assistantOpen ? 'hidden md:hidden' : ''}`}>
        <button 
          onClick={() => {
            alert('Служба поддержки Сбер Бизнес Онлайн: оператор-консультант готов ответить на ваши вопросы по телефону +375 17 359-99-11.');
          }}
          className="w-12 h-12 rounded-full bg-sber-green hover:bg-sber-green-hover text-white flex items-center justify-center shadow-lg transition-transform hover:scale-115 active:scale-95 group relative focus:outline-none"
        >
          <MessageSquare className="w-5.5 h-5.5" />
          <span className="absolute -top-1 -right-1 flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-505"></span>
          </span>
          {/* Tooltip trigger pop */}
          <span className="absolute right-14 bg-gray-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg shadow whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-350 pointer-events-none">
            Чат-поддержка Сбера онлайн
          </span>
        </button>
      </div>

      {/* MODAL WINDOWS FOR HEADER TRIGGERS */}
      {/* Support dialogue */}
      {phoneAlertModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-md w-full shadow-2xl space-y-4 animate-scaleIn text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-sm uppercase tracking-wider text-[#2c3e50]">Центр поддержки ОАО «Сбер Банк»</span>
              <button onClick={() => setPhoneAlertModal(false)} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">X</button>
            </div>
            <p className="leading-relaxed">Для корпоративных клиентов Сбер Банка действует выделенная линия технической поддержки в Минске:</p>
            <div className="bg-slate-50 p-4 rounded-xl border space-y-2 text-center font-bold text-gray-750 text-base">
              <p className="hover:text-sber-green cursor-pointer">+375 (17) 359-99-11</p>
              <p className="hover:text-sber-green cursor-pointer">+375 (29) 359-99-11</p>
            </div>
            <p className="text-[10.5px] text-gray-450 text-center italic">Режим работы операторов: ПН-ПТ 08:30 — 19:30. Вызовы бесплатны.</p>
          </div>
        </div>
      )}

      {/* Notifications system alerts list */}
      {notificationModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-sm w-full shadow-2xl space-y-4 animate-scaleIn text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-[#2c3e50] uppercase text-sm tracking-wider">Системные Уведомления Сбера</span>
              <button onClick={() => setNotificationModalOpen(false)} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">X</button>
            </div>
            <div className="space-y-3">
              <div className="border border-green-150 bg-green-50 p-3 rounded-lg flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-green-900 leading-none">Лимиты трат одобрены</h4>
                  <p className="text-[10px] text-green-800 mt-1">Овердрафт для юрлица одобрен до лимита 50 000 BYN. Ставка снижена до 7%!</p>
                </div>
              </div>
              <div className="border border-blue-150 bg-blue-50 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sky-900 leading-none">Отчет по налогам обработан</h4>
                  <p className="text-[10px] text-sky-800 mt-1">Налоговая декларация за прошлый отчетный месяц признана действительной.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Postal messages box */}
      {emailModalOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-md w-full shadow-2xl space-y-4 animate-scaleIn text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-[#2c3e50] uppercase text-sm tracking-wider">Письма поддержки и новости</span>
              <button onClick={() => setEmailModalOpen(false)} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">X</button>
            </div>
            <div className="space-y-3.5 divide-y divide-gray-100">
              <div className="pt-2">
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Отдел Валютного Контроля</span>
                  <span className="text-[10px] text-gray-400">Сегодня 09:12</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Уважаемый клиент! Оформлено подтверждение внешнеэкономической сделки с контрагентом ООО БелТелесистемы. Дополнительных документов предоставлять не требуется.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Slide-out Interactive Copilot Sidebar Component */}
      <Copilot isOpen={assistantOpen} onClose={() => setAssistantOpen(false)} />

      {/* Sber "Create Document" 3x3 Overlay Modal (from user's screenshot request) */}
      <CreateDocumentModal 
        isOpen={isCreateDocumentOpen}
        onClose={() => setIsCreateDocumentOpen(false)}
        accounts={accounts}
        setAccounts={setAccounts}
        documents={documents}
        setDocuments={setDocuments}
        setActiveTab={setActiveTab}
      />

    </div>
  );
}
