"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { fetchNotifications, type SmartNotification } from "@/lib/api/banking";

interface Props {
  phoneOpen: boolean;
  notificationsOpen: boolean;
  emailOpen: boolean;
  onClosePhone: () => void;
  onCloseNotifications: () => void;
  onCloseEmail: () => void;
}

function notificationStyles(severity: string) {
  if (severity === "critical") {
    return {
      box: "border-red-200 bg-red-50",
      icon: "text-red-600",
      title: "text-red-900",
      body: "text-red-800",
      Icon: AlertCircle,
    };
  }
  if (severity === "warn") {
    return {
      box: "border-amber-200 bg-amber-50",
      icon: "text-amber-600",
      title: "text-amber-900",
      body: "text-amber-800",
      Icon: AlertCircle,
    };
  }
  if (severity === "success") {
    return {
      box: "border-green-200 bg-green-50",
      icon: "text-green-600",
      title: "text-green-900",
      body: "text-green-800",
      Icon: CheckCircle2,
    };
  }
  return {
    box: "border-blue-200 bg-blue-50",
    icon: "text-sky-600",
    title: "text-sky-900",
    body: "text-sky-800",
    Icon: Info,
  };
}

export function BankingModals({
  phoneOpen,
  notificationsOpen,
  emailOpen,
  onClosePhone,
  onCloseNotifications,
  onCloseEmail,
}: Props) {
  const [notifications, setNotifications] = useState<SmartNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!notificationsOpen) return;
    setLoading(true);
    void fetchNotifications(false)
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, [notificationsOpen]);

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
          <div className="bg-white rounded-2xl p-6 border max-w-sm w-full shadow-2xl space-y-4 text-xs max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-[#2c3e50] uppercase text-sm tracking-wider">
                Системные Уведомления Сбера
              </span>
              <button onClick={onCloseNotifications} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">
                X
              </button>
            </div>
            {loading ? (
              <p className="text-center text-gray-400 py-4">Загрузка уведомлений...</p>
            ) : notifications.length === 0 ? (
              <p className="text-center text-gray-400 py-4">Нет активных уведомлений</p>
            ) : (
              <div className="space-y-3">
                {notifications.map((n) => {
                  const styles = notificationStyles(n.severity);
                  const Icon = styles.Icon;
                  return (
                    <div key={n.id} className={`border p-3 rounded-lg flex gap-2 ${styles.box}`}>
                      <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${styles.icon}`} />
                      <div>
                        <h4 className={`font-bold leading-none ${styles.title}`}>{n.title}</h4>
                        <p className={`text-[10px] mt-1 ${styles.body}`}>{n.body}</p>
                        {n.due_date ? (
                          <p className={`text-[9px] mt-1 font-semibold ${styles.body}`}>Срок: {n.due_date}</p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {emailOpen && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 border max-w-md w-full shadow-2xl space-y-4 text-xs">
            <div className="flex justify-between items-center border-b pb-2">
              <span className="font-extrabold text-[#2c3e50] uppercase text-sm tracking-wider">
                Сообщения от Сбер Бизнес
              </span>
              <button onClick={onCloseEmail} className="px-1 hover:bg-slate-50 text-gray-400 rounded-full font-bold">
                X
              </button>
            </div>
            <div className="border border-gray-150 p-3 rounded-lg">
              <h4 className="font-bold text-gray-900 leading-none">Обновление тарифа «Легкий старт»</h4>
              <p className="text-[10px] text-gray-500 mt-1">
                С 01.07.2026 лимит бесплатных межбанковских переводов увеличен до 5 в месяц для вашего пакета.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
