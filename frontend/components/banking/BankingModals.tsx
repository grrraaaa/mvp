"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";

interface Props {
  phoneOpen: boolean;
  notificationsOpen: boolean;
  emailOpen: boolean;
  onClosePhone: () => void;
  onCloseNotifications: () => void;
  onCloseEmail: () => void;
}

export function BankingModals({
  phoneOpen,
  notificationsOpen,
  emailOpen,
  onClosePhone,
  onCloseNotifications,
  onCloseEmail,
}: Props) {
  return (
    <>
      {phoneOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-sm uppercase tracking-wider text-[#2c3e50]">
                Центр поддержки ОАО «Сбер Банк»
              </span>
              <button onClick={onClosePhone} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">
                X
              </button>
            </div>
            <p className="leading-relaxed">
              Для корпоративных клиентов Сбер Банка действует выделенная линия технической поддержки в Минске:
            </p>
            <div className="bg-slate-50 p-4 rounded-xl border space-y-2 text-center font-bold text-gray-700 text-base">
              <p className="hover:text-[#138d8a] cursor-pointer">+375 (17) 359-99-11</p>
              <p className="hover:text-[#138d8a] cursor-pointer">+375 (29) 359-99-11</p>
            </div>
            <p className="text-[10.5px] text-gray-500 text-center italic">
              Режим работы операторов: ПН-ПТ 08:30 — 19:30. Вызовы бесплатны.
            </p>
          </div>
        </div>
      )}

      {notificationsOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-sm w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-[#2c3e50] uppercase text-sm tracking-wider">
                Системные Уведомления Сбера
              </span>
              <button onClick={onCloseNotifications} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">
                X
              </button>
            </div>
            <div className="space-y-3">
              <div className="border border-green-200 bg-green-50 p-3 rounded-lg flex gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-green-900 leading-none">Лимиты трат одобрены</h4>
                  <p className="text-[10px] text-green-800 mt-1">
                    Овердрафт для юрлица одобрен до лимита 50 000 BYN. Ставка снижена до 7%!
                  </p>
                </div>
              </div>
              <div className="border border-blue-200 bg-blue-50 p-3 rounded-lg flex gap-2">
                <AlertCircle className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-sky-900 leading-none">Отчет по налогам обработан</h4>
                  <p className="text-[10px] text-sky-800 mt-1">
                    Налоговая декларация за прошлый отчетный месяц признана действительной.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {emailOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-[#2c3e50] uppercase text-sm tracking-wider">
                Письма поддержки и новости
              </span>
              <button onClick={onCloseEmail} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">
                X
              </button>
            </div>
            <div className="space-y-3.5 divide-y divide-gray-100">
              <div className="pt-2">
                <div className="flex justify-between font-bold text-gray-800">
                  <span>Отдел Валютного Контроля</span>
                  <span className="text-[10px] text-gray-400">Сегодня 09:12</span>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                  Уважаемый клиент! Оформлено подтверждение внешнеэкономической сделки с контрагентом ООО
                  БелТелесистемы. Дополнительных документов предоставлять не требуется.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
