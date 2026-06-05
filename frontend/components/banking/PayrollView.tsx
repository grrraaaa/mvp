"use client";

import { useEffect, useState, type FormEvent } from "react";
import { ASSISTANT_ACTION_EVENT } from "@/lib/assistant/uiBridge";
import {
  Users2,
  Wallet,
  PlusCircle,
  X,
  HelpCircle,
  CheckCircle2,
  FileCheck2,
  Building2,
  Sparkles,
  ChevronRight,
  DollarSign,
  RefreshCw,
} from "lucide-react";
import type { EmployeeSalary } from "@/lib/banking/types";
import { useBankingStore } from "@/store/bankingStore";

export default function PayrollView() {
  const accounts = useBankingStore((s) => s.accounts);
  const setEmployees = useBankingStore((s) => s.setEmployees);
  const employees = useBankingStore((s) => s.employees);
  const runPayroll = useBankingStore((s) => s.runPayroll);
  const [activeTab, setActiveTab] = useState<'hub' | 'employees' | 'payout' | 'onboard'>('hub');
  
  // New Employee state
  const [empName, setEmpName] = useState('');
  const [empCard, setEmpCard] = useState('');
  const [empAmount, setEmpAmount] = useState('');

  // Payout states
  const [payoutBynAccount, setPayoutBynAccount] = useState('');
  const [payStatus, setPayStatus] = useState<'idle' | 'loading' | 'success'>('idle');

  const totalPayrollSum = employees.reduce((sum, e) => sum + e.amount, 0);

  useEffect(() => {
    const handler = (e: Event) => {
      const action = (e as CustomEvent<{ action: string }>).detail?.action;
      if (action === "run-payroll") {
        setActiveTab("payout");
        const byn = accounts.find((a) => a.currency === "BYN");
        if (byn && !payoutBynAccount) setPayoutBynAccount(byn.id);
      }
    };
    window.addEventListener(ASSISTANT_ACTION_EVENT, handler);
    return () => window.removeEventListener(ASSISTANT_ACTION_EVENT, handler);
  }, [accounts, payoutBynAccount]);

  const handleAddEmployee = (e: FormEvent) => {
    e.preventDefault();
    if (!empName || !empCard || !empAmount) {
      alert('Пожалуйста, заполните все свойства сотрудника.');
      return;
    }

    const valueNum = parseFloat(empAmount);
    if (isNaN(valueNum) || valueNum <= 0) {
      alert('Пожалуйста, укажите верную сумму начислений.');
      return;
    }

    const newEmp: EmployeeSalary = {
      id: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
      fullName: empName,
      cardNumber: empCard.startsWith('****') ? empCard : `**** ${empCard.slice(-4)}`,
      amount: valueNum,
      status: 'Готов'
    };

    setEmployees(prev => [...prev, newEmp]);
    setEmpName('');
    setEmpCard('');
    setEmpAmount('');
    setActiveTab('employees');
    alert('Сотрудник успешно включен в зарплатный реестр компании в Сбере!');
  };

  const handleBulkPayrollPayout = (e: FormEvent) => {
    e.preventDefault();
    if (!payoutBynAccount) {
      alert('Сначала укажите расчетный счет списания.');
      return;
    }

    if (employees.length === 0) {
      alert('В зарплатном списке нет сотрудников для расчета.');
      return;
    }

    const selectedAcc = accounts.find(a => a.id === payoutBynAccount);
    if (selectedAcc && selectedAcc.balance < totalPayrollSum) {
      alert(`Нехватка средств. Баланс счета: ${selectedAcc.balance.toLocaleString()} BYN. Требуется: ${totalPayrollSum.toLocaleString()} BYN.`);
      return;
    }

    setPayStatus("loading");
    setTimeout(() => {
      void runPayroll(payoutBynAccount)
        .then((ok) => {
          setPayStatus(ok ? "success" : "idle");
          if (!ok) alert("Не удалось выполнить выплату. Проверьте баланс и реестр сотрудников.");
        })
        .catch(() => {
          setPayStatus("idle");
          alert("Ошибка выплаты. Проверьте API и PostgreSQL.");
        });
    }, 1500);
  };

  const handleDeleteEmployee = (empId: string) => {
    setEmployees(prev => prev.filter(e => e.id !== empId));
  };

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* View Header wrapper */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Зарплатное обслуживание</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
            Выплаты персоналу на карты, налоговые справки и тарифные опции
          </p>
        </div>
        {activeTab !== 'hub' && (
          <button 
            onClick={() => { setActiveTab('hub'); setPayStatus('idle'); }}
            className="text-xs font-bold text-sky-700 hover:underline border border-sky-300 rounded px-3 py-1 bg-sky-50"
          >
            ← К опциям Зарплаты
          </button>
        )}
      </div>

      {activeTab === 'hub' ? (
        /* Payroll Hub matching Screenshot 2 cards completely */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
          
          {/* Card 1: Зарплатный проект */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b pb-3.5">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Wallet className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Зарплатный проект</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Реестры на выплату, карты Сбер</span>
              </div>
            </div>

            {/* Column links */}
            <div className="space-y-3">
              <button 
                onClick={() => setActiveTab('payout')}
                className="w-full text-left flex items-center justify-between hover:text-sky-700 font-semibold text-xs text-sky-800 focus:outline-none focus:underline"
              >
                <span>Переводы на счета физических лиц</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>

              <button 
                onClick={() => setActiveTab('employees')}
                className="w-full text-left flex items-center justify-between hover:text-sky-700 font-semibold text-xs text-sky-800 focus:outline-none focus:underline"
              >
                <div className="flex items-center gap-1.5">
                  <span>Списки физических лиц на выплату</span>
                  <span className="bg-[#138d8a] text-white text-[9px] font-bold px-1.5 rounded-full">
                    {employees.length}
                  </span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>

              <button 
                onClick={() => setActiveTab('onboard')}
                className="w-full text-left flex items-center justify-between hover:text-sky-700 font-semibold text-xs text-sky-800 focus:outline-none focus:underline"
              >
                <span>Подключение зарплатного проекта</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

          {/* Card 2: Справки (Screenshot 2 right column links) */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b pb-3.5">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <FileCheck2 className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Налоговый и аудит контроль</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">Справки Фонда обязательств и ФСЗН</span>
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={() => alert('Формирование справки об исполнении обязательств перед налоговым ведомством Республики Беларусь. Отчет отправлен в ваш кабинет.')}
                className="w-full text-left flex items-center justify-between hover:text-sky-700 font-semibold text-xs text-sky-800 focus:outline-none focus:underline"
              >
                <span>Справки об исполнении налоговых обязательств</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>

              <button 
                onClick={() => alert('Запрос справки ФСЗН (об отсутствии задолженностей и своевременной выплате пенсионных страховых взносов).')}
                className="w-full text-left flex items-center justify-between hover:text-sky-700 font-semibold text-xs text-sky-800 focus:outline-none focus:underline"
              >
                <span>Справки об отсутствии обязательств перед Фондом</span>
                <ChevronRight className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>

        </div>
      ) : activeTab === 'employees' ? (
        
        /* Interactive employee lists (Fidelity bonus!) */
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b pb-3.5">
            <div className="flex items-center gap-2">
              <Users2 className="w-5 h-5 text-[#138d8a]" />
              <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">Списки физических лиц на выплату</h3>
            </div>
            
            <span className="text-xs font-bold text-gray-400">
              Суммарный фонд зарплаты: <strong className="text-gray-800">{totalPayrollSum.toLocaleString()} BYN</strong>
            </span>
          </div>

          {/* Form to add employee */}
          <form onSubmit={handleAddEmployee} className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4.5 rounded-xl border select-none text-xs">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">ФИО Сотрудника (клиента)</label>
              <input 
                type="text" 
                value={empName} 
                onChange={(e) => setEmpName(e.target.value)}
                placeholder="Иванов Иван Иванович"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Номер карты Сбера</label>
              <input 
                type="text" 
                value={empCard} 
                onChange={(e) => setEmpCard(e.target.value)}
                placeholder="4000 1234 5678 9012"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white font-semibold"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Размер оклада (BYN)</label>
              <input 
                type="number" 
                value={empAmount} 
                onChange={(e) => setEmpAmount(e.target.value)}
                placeholder="например, 1500"
                className="w-full border border-gray-300 rounded px-2.5 py-1.5 bg-white font-bold text-gray-800"
                required
              />
            </div>
            <div className="flex items-end">
              <button 
                type="submit"
                className="w-full py-1.5 bg-[#128e8b] hover:bg-[#107c79] text-white rounded font-bold transition flex items-center justify-center gap-1 shrink-0"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Добавить</span>
              </button>
            </div>
          </form>

          {/* Employee list Table */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b text-gray-400 font-bold uppercase text-[9px] tracking-widest">
                  <th className="py-3 px-5">Идентификатор</th>
                  <th className="py-3 px-5">ФИО Сотрудника</th>
                  <th className="py-3 px-5">Банковская карта</th>
                  <th className="py-3 px-5 text-right">Начисление оклада</th>
                  <th className="py-3 px-5 text-center">Статус транша</th>
                  <th className="py-3 px-5 text-right">Удалить</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {employees.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-gray-400 font-medium">
                      В зарплатном проекте нет прикрепленных сотрудников. Заполните форму выше для добавления.
                    </td>
                  </tr>
                ) : (
                  employees.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-5 font-mono text-gray-400">{e.id}</td>
                      <td className="py-3 px-5 font-black text-gray-800">{e.fullName}</td>
                      <td className="py-3 px-5 font-mono text-gray-600 font-semibold">{e.cardNumber}</td>
                      <td className="py-3 px-5 text-right font-black text-gray-900">
                        {e.amount.toLocaleString()} BYN
                      </td>
                      <td className="py-3 px-5 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          e.status === 'Оплачен' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-150'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-150'
                        }`}>
                          {e.status}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button 
                          onClick={() => handleDeleteEmployee(e.id)}
                          className="text-red-600 hover:text-red-900 cursor-pointer font-bold hover:underline"
                        >
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

        </div>

      ) : activeTab === 'payout' ? (
        
        /* Payroll bulk transfer process */
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-5">
          <div className="border-b pb-3 flex items-center gap-1.5 text-[#138d8a]">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">
              Переводы на счета физических лиц (Зарплатная выплата)
            </h3>
          </div>

          {payStatus === 'idle' ? (
            <form onSubmit={handleBulkPayrollPayout} className="space-y-4 text-xs font-medium">
              <div className="bg-sky-50 p-4 rounded-xl border border-sky-150 space-y-2 select-text">
                <p>Вы собираетесь перечислить зарплату всем сотрудникам зарплатного проекта ОАО «Сбер Банк»:</p>
                <div className="flex justify-between font-bold text-gray-800 text-sm">
                  <span>Общее число сотрудников:</span> <span>{employees.length} чел.</span>
                </div>
                <div className="flex justify-between font-black text-[#138d8a] text-sm pt-1.5 border-t">
                  <span>Итоговый фонд выплаты:</span> <span>{totalPayrollSum.toLocaleString()} BYN</span>
                </div>
              </div>

              <div>
                <label className="block mb-1.5 font-bold text-gray-700">Списать с расчетного счета (BYN) *</label>
                <select 
                  value={payoutBynAccount}
                  onChange={(e) => setPayoutBynAccount(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-semibold bg-white text-gray-750"
                  required
                >
                  <option value="">-- Выберите рублевый счет --</option>
                  {accounts.filter(acc => acc.currency === 'BYN').map(acc => (
                    <option key={acc.id} value={acc.id}>
                      {acc.id} ({acc.label}) — Баланс: {acc.balance.toLocaleString()} BYN
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                data-assistant-action="run-payroll"
                className="w-full py-3 bg-[#128e8b] hover:bg-[#107c79] text-white text-xs font-black rounded-lg transition shadow active:scale-95"
              >
                Совершить выплату реестра в Сбер
              </button>
            </form>
          ) : payStatus === 'loading' ? (
            <div className="p-12 text-center space-y-3.5 bg-slate-50 rounded-xl border">
              <RefreshCw className="w-8 h-8 text-[#138d8a] animate-spin mx-auto" />
              <p className="text-xs font-bold text-gray-500">
                Зачисление зарплатных окладов на личные карты физических лиц Сбера. Завершение клиринга...
              </p>
            </div>
          ) : (
            <div className="p-10 text-center space-y-4 bg-emerald-50 rounded-xl border border-emerald-150 animate-scaleIn text-xs">
              <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto" />
              <h4 className="text-emerald-900 font-extrabold text-sm">Зарплатный транш успешно проведен!</h4>
              <p className="max-w-md mx-auto text-emerald-800 leading-relaxed font-semibold">
                Все {employees.length} окладов мгновенно зачислены. Сформировано платежное требование на сумму {totalPayrollSum.toLocaleString()} BYN, внесенное в журнал движения денежных средств.
              </p>
              <button 
                onClick={() => { setActiveTab('hub'); setPayStatus('idle'); }}
                className="bg-white border border-emerald-300 px-6 py-2 rounded-lg font-bold text-emerald-800 hover:bg-emerald-100 transition"
              >
                Отлично
              </button>
            </div>
          )}
        </div>

      ) : (
        
        /* Connected state */
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs p-10 space-y-4 text-center">
          <Sparkles className="w-10 h-10 text-[#138d8a] mx-auto animate-pulse" />
          <h3 className="font-extrabold text-sm uppercase tracking-wider text-gray-800">Быстрое подключение нового проекта</h3>
          <p className="text-xs text-gray-550 max-w-lg mx-auto leading-relaxed">
            Присоединяйтесь к партнерской программе ОАО «Сбер Банк» для юрлиц в Беларуси! Комиссия за выплаты 0.1% или 0 BYN при подключении пакета «Максимум». Выпуск пластиковых премиум карт вашим сотрудникам бесплатно.
          </p>
          <button 
            onClick={() => {
              alert('Ваш запрос на присоединение отправлен в корпоративный отдел Сбер Банка. Оператор перезвонит в течение 5 минут!');
              setActiveTab('hub');
            }}
            className="px-6 py-2.5 bg-[#128e8b] text-white text-xs font-bold hover:bg-[#107c79] transition rounded-lg"
          >
            Отправить онлайн-заявку бизнеса
          </button>
        </div>
      )}

    </div>
  );
}
