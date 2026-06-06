"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  Printer,
  Download,
  RefreshCw,
  Check,
  AlertCircle,
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import type { BankDocument } from "@/lib/banking/types";
import { fetchStatement, type StatementLine } from "@/lib/api/banking";
import { bankingToast } from "@/lib/banking/toast";
import { useBankingStore } from "@/store/bankingStore";

export default function StatementView() {
  const accounts = useBankingStore((s) => s.accounts);
  const documents = useBankingStore((s) => s.documents);
  // Navigation Tabs inside Statement module
  const [activeSubTab, setActiveSubTab] = useState<'accounts' | 'corp_cards' | 'balances' | 'report' | 'schedule'>('accounts');

  // Filters State
  const [selectedAccount, setSelectedAccount] = useState<string>('all');
  const [selectedPeriod, setSelectedPeriod] = useState<'Сегодня' | 'Вчера' | '5дней' | 'месяц'>('Сегодня');
  const [showZeroTurnover, setShowZeroTurnover] = useState(false);
  const [showDaily, setShowDaily] = useState(true);
  const [showRevaluation, setShowRevaluation] = useState(false);

  // Loader & Report generated state
  const [isLoading, setIsLoading] = useState(false);
  const [reportGenerated, setReportGenerated] = useState(false);
  const [statementData, setStatementData] = useState<BankDocument[]>([]);
  const [statementLines, setStatementLines] = useState<StatementLine[]>([]);
  const [summaryReport, setSummaryReport] = useState<any>(null);

  const resetFilters = () => {
    setSelectedAccount('all');
    setSelectedPeriod('Сегодня');
    setShowZeroTurnover(false);
    setShowDaily(true);
    setShowRevaluation(false);
    setReportGenerated(false);
  };

  const handleGenerateStatement = () => {
    setIsLoading(true);
    setReportGenerated(false);
    const accId = selectedAccount !== "all" ? selectedAccount : undefined;
    const periodKey =
      selectedPeriod === "Сегодня"
        ? "today"
        : selectedPeriod === "Вчера"
          ? "yesterday"
          : selectedPeriod === "5дней"
            ? "5days"
            : "month";
    void fetchStatement(accId, periodKey)
      .then((lines) => {
        setStatementLines(lines);
        const totalDebit = lines.reduce((s, l) => s + l.debit, 0);
        const totalCredit = lines.reduce((s, l) => s + l.credit, 0);
        const accObject = selectedAccount !== "all" ? accounts.find((a) => a.id === selectedAccount) : null;
        const curLabel = accObject ? accObject.currency : "BYN";
        const endBalance = lines[0]?.balance_after ?? accObject?.balance ?? 0;
        setStatementData(
          lines.map((l) => ({
            id: l.doc_ref,
            date: l.operation_date,
            type: l.debit > 0 ? "Списание" : "Поступление",
            counterparty: l.counterparty,
            debit: l.debit,
            credit: l.credit,
            amount: l.debit || l.credit,
            currency: curLabel,
            status: "Проведен",
            purpose: l.purpose,
          })),
        );
        setSummaryReport({
          currency: curLabel,
          openingBalance: endBalance + totalDebit - totalCredit,
          totalDebit,
          totalCredit,
          closingBalance: endBalance,
          transactionsCount: lines.length,
        });
        bankingToast(`Выписка: ${lines.length} операций из PostgreSQL`, "ok");
        setReportGenerated(true);
      })
      .catch(() => {
        bankingToast("Не удалось загрузить выписку из API", "err");
        setStatementData([...documents]);
        setReportGenerated(true);
      })
      .finally(() => setIsLoading(false));
  };

  const triggerPrint = () => {
    window.print();
  };

  const triggerPdfDownload = () => {
    alert('Имитация PDF: Отчет банковской выписки сформирован и сохранен на диск как SberBank_Statement_2026.pdf!');
  };

  return (
    <div className="space-y-6 font-sans select-none">
      
      {/* Sber title indicator */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900 leading-tight">Банковская выписка</h1>
          <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
            История транзакций по счетам и корпоративным картам
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          <Link
            href="/statement/account"
            data-assistant-action="open-statement-account"
            className="font-bold text-sky-700 hover:underline border border-sky-200 rounded px-3 py-1.5 bg-sky-50"
          >
            Выписка по счёту
          </Link>
          <Link
            href="/statement/certificates"
            data-assistant-action="open-statement-cert"
            className="font-bold text-sky-700 hover:underline border border-sky-200 rounded px-3 py-1.5 bg-sky-50"
          >
            Справки
          </Link>
        </div>
      </div>

      {/* Main Container */}
      <div className="bg-white rounded-2xl border border-gray-150 shadow-xs overflow-hidden">
        
        {/* Tab selector bar BELOW subheader (Screenshot 3 tabs) */}
        <div className="bg-slate-50 border-b border-gray-150 px-5 flex flex-wrap gap-2 text-xs font-bold font-sans">
          {[
            { id: 'accounts', label: 'ПО СЧЕТАМ' },
            { id: 'corp_cards', label: 'ПО КОРПОКАРТАМ' },
            { id: 'balances', label: 'РЕЕСТР ОСТАТКОВ' },
            { id: 'report', label: 'ОТЧЕТ' },
            { id: 'schedule', label: 'ВЫПИСКА ПО РАСПИСАНИЮ' }
          ].map((tab) => {
            const isSel = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveSubTab(tab.id as any)}
                className={`py-3.5 px-4 focus:outline-none transition-all uppercase tracking-wide border-b-2 font-black ${
                  isSel 
                    ? 'border-[#138d8a] text-[#138d8a]' 
                    : 'border-transparent text-gray-550 hover:text-[#138d8a]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dynamic Inner Tab container */}
        <div className="p-6 space-y-6">
          
          {activeSubTab === 'accounts' ? (
            <>
              {/* Filter Area (Screenshot 3 filter widget) */}
              <div className="bg-[#f8fafc]/80 border border-gray-150 rounded-xl p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  {/* Account Selector filter */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Расчетный счет и валюта</label>
                    <div className="relative">
                      <select
                        value={selectedAccount}
                        onChange={(e) => setSelectedAccount(e.target.value)}
                        className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold bg-white text-gray-750 focus:ring-[#138d8a] focus:ring-1 focus:border-[#138d8a]"
                      >
                        <option value="all">Все валюты • Все счета</option>
                        {accounts.map(acc => (
                          <option key={acc.id} value={acc.id}>
                            {acc.id} ({acc.label}) — {acc.balance.toLocaleString()} {acc.currency}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Period selection dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">Временной интервал</label>
                    <select
                      value={selectedPeriod}
                      onChange={(e) => setSelectedPeriod(e.target.value as any)}
                      className="w-full border border-gray-300 rounded-lg p-2.5 text-xs font-semibold bg-white text-gray-750 focus:ring-[#138d8a] focus:ring-1 focus:border-[#138d8a]"
                    >
                      <option value="Сегодня">Сегодня</option>
                      <option value="Вчера">За вчерашний день</option>
                      <option value="5дней">За последние 5 дней</option>
                      <option value="месяц">Текущий отчетный месяц</option>
                    </select>
                  </div>

                  {/* Reset Actions links */}
                  <div className="flex items-end pb-2">
                    <button 
                      onClick={resetFilters}
                      className="text-xs text-sky-700 font-extrabold hover:underline leading-none hover:text-sky-900 cursor-pointer"
                    >
                      Сбросить фильтры
                    </button>
                  </div>

                </div>

                {/* Additional Checkboxes list (Screenshot 3 checkboxes) */}
                <div className="flex flex-wrap items-center gap-6 text-xs font-medium pt-2 border-t border-gray-150/55 text-gray-600">
                  
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showZeroTurnover}
                      onChange={(e) => setShowZeroTurnover(e.target.checked)}
                      className="rounded border-gray-300 text-[#138d8a] focus:ring-[#138d8a] h-4 w-4"
                    />
                    <span>Показывать нулевые обороты</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showDaily}
                      onChange={(e) => setShowDaily(e.target.checked)}
                      className="rounded border-gray-300 text-[#138d8a] focus:ring-[#138d8a] h-4 w-4"
                    />
                    <span>Показывать выписку за каждый день</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={showRevaluation}
                      onChange={(e) => setShowRevaluation(e.target.checked)}
                      className="rounded border-gray-300 text-[#138d8a] focus:ring-[#138d8a] h-4 w-4"
                    />
                    <span>Показывать переоценку курсов</span>
                  </label>

                </div>

                {/* Confirm submit row */}
                <div className="flex justify-end pt-2">
                  <button
                    onClick={handleGenerateStatement}
                    disabled={isLoading}
                    className="bg-[#128e8b] hover:bg-[#107c79] text-white px-8 py-3 rounded-lg text-xs font-black shadow-sm disabled:bg-gray-200 transition-all active:scale-[0.98] flex items-center gap-2 text-center"
                  >
                    {isLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    <span>Сформировать выписку</span>
                  </button>
                </div>

              </div>

              {/* Loader spinning frame */}
              {isLoading && (
                <div className="p-12 text-center flex flex-col items-center justify-center gap-3 animate-pulse bg-slate-50 rounded-xl border">
                  <RefreshCw className="w-8 h-8 text-[#138d8a] animate-spin" />
                  <p className="text-xs font-bold text-gray-500">
                    Пожалуйста, подождите, Сбер Бизнес опрашивает клиринговые реестры...
                  </p>
                </div>
              )}

              {/* Statement Result section */}
              {reportGenerated && summaryReport && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* Summary balances widgets */}
                  <div className="bg-slate-50 border border-gray-150 p-6 rounded-xl space-y-4">
                    <div className="flex items-center justify-between border-b pb-3 border-gray-200">
                      <div>
                        <h4 className="text-sm font-black text-gray-900 leading-none">Сводный баланс оборотов по выписке</h4>
                        <span className="text-[10px] text-gray-400 font-semibold uppercase mt-1 inline-block">Итоговые проводки</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button 
                          onClick={triggerPrint}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded hover:bg-white text-xs font-semibold text-gray-600 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Печать</span>
                        </button>
                        <button 
                          onClick={triggerPdfDownload}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#128e8b] text-white rounded hover:bg-[#107c79] text-xs font-semibold transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Скачать в PDF</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs font-medium">
                      <div className="bg-white p-3.5 border rounded-lg">
                        <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Входящий остаток</span>
                        <span className="text-sm font-black text-gray-800">
                          {summaryReport.openingBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {summaryReport.currency}
                        </span>
                      </div>
                      
                      <div className="bg-white p-3.5 border rounded-lg text-emerald-800">
                        <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Обороты по Дебету (-)</span>
                        <span className="text-sm font-black">
                          - {summaryReport.totalDebit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {summaryReport.currency}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 border rounded-lg text-indigo-800">
                        <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Обороты по Кредиту (+)</span>
                        <span className="text-sm font-black">
                          + {summaryReport.totalCredit.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {summaryReport.currency}
                        </span>
                      </div>

                      <div className="bg-white p-3.5 border rounded-xl border-[#138d8a]/40 bg-teal-50/20">
                        <span className="text-gray-400 font-bold block uppercase tracking-wider text-[9px] mb-1">Исходящий остаток</span>
                        <span className="text-sm font-black text-gray-950">
                          {summaryReport.closingBalance.toLocaleString('ru-RU', { minimumFractionDigits: 2 })} {summaryReport.currency}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Statements Report Table */}
                  <div className="border border-gray-150 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs border-collapse font-sans">
                      <thead>
                        <tr className="bg-slate-50 border-b text-gray-400 font-extrabold uppercase text-[9px] tracking-widest select-none">
                          <th className="py-3.5 px-4">Дата / Время</th>
                          <th className="py-3.5 px-4 font-bold">Документ</th>
                          <th className="py-3.5 px-4">Контрагент / УНП</th>
                          <th className="py-3.5 px-4">Назначение платежа</th>
                          <th className="py-3.5 px-4 text-right">Расход (-)</th>
                          <th className="py-3.5 px-4 text-right">Поступление (+)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {statementData.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-gray-450 font-semibold select-all">
                              По выбранным критериям и периоду проводок в Сбере не зарегистрировано.
                            </td>
                          </tr>
                        ) : (
                          statementData.map((doc, idx) => (
                            <tr key={doc.id + idx} className="hover:bg-slate-50/50 transition">
                              <td className="py-3.5 px-4 font-bold text-gray-700">{doc.date}</td>
                              <td className="py-3.5 px-4 text-sky-800 font-semibold">{doc.id}</td>
                              <td className="py-3.5 px-4 font-extrabold text-gray-900">{doc.counterparty}</td>
                              <td className="py-3.5 px-4 text-gray-550 max-w-[220px] truncate">{doc.purpose}</td>
                              <td className="py-3.5 px-4 text-right text-red-600 font-extrabold whitespace-nowrap">
                                {(doc as { debit?: number }).debit
                                  ? `- ${((doc as { debit?: number }).debit ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${doc.currency}`
                                  : "—"}
                              </td>
                              <td className="py-3.5 px-4 text-right text-indigo-700 font-extrabold whitespace-nowrap">
                                {(doc as { credit?: number }).credit
                                  ? `+ ${((doc as { credit?: number }).credit ?? 0).toLocaleString("ru-RU", { minimumFractionDigits: 2 })} ${doc.currency}`
                                  : "—"}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                </div>
              )}
            </>
          ) : (
            <div className="p-16 text-center space-y-3.5 bg-slate-50 rounded-xl border border-dashed text-gray-400 font-medium">
              <AlertCircle className="w-8 h-8 text-[#138d8a] mx-auto animate-pulse" />
              <p>Раздел находится в демо-режиме.</p>
              <p className="text-xs">Нажмите вкладку <strong>«ПО СЧЕТАМ»</strong> для интерактивного формирования выписок!</p>
            </div>
          )}

        </div>

      </div>

    </div>
  );
}
