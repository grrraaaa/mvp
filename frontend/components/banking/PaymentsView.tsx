"use client";

import Link from "next/link";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import {
  CreditCard,
  Coins,
  ShieldCheck,
  Scale,
  ChevronRight,
  PlusCircle,
} from "lucide-react";
import { useRole } from "@/store/roleStore";

export default function PaymentsView() {
  const { openDocumentModal } = useSbbolUi();
  const { can, denyTitle } = useRole();

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
          disabled={!can("create_document")}
          title={can("create_document") ? undefined : denyTitle("create_document")}
          className="bg-[#128e8b] hover:bg-[#107c79] text-white px-5 py-2.5 rounded-lg text-xs font-bold shadow-md shrink-0 disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          Создать документ
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  onClick={() => alert("Проверка акцептов платежных требований в обработке.")}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Акцепт платежных требований</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => alert("Бронирование денежных средств с расчетного счета.")}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Бронирование денежных средств</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => {
                    const rcpt = prompt("Имя бенефициара за рубежом:", "Vikas K");
                    if (rcpt) alert(`Подготовка Swift сообщения в иностранной валюте для бенефициара ${rcpt}.`);
                  }}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Переводы в инвалюте</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                {can("create_document") ? (
                  <Link
                    href="/payments/currency"
                    data-assistant-action="open-payment-currency"
                    className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                  >
                    <span className="text-xs font-semibold text-sky-700 hover:underline">Покупка/продажа (конверсия)</span>
                    <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                  </Link>
                ) : (
                  <span
                    className="flex items-center justify-between text-left w-full opacity-40 cursor-not-allowed"
                    title={denyTitle("create_document")}
                  >
                    <span className="text-xs font-semibold text-sky-700">Покупка/продажа (конверсия)</span>
                    <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-3">
                <button
                  onClick={() =>
                    alert("Наличные BYN можно забрать с использованием чековой книжки или токена в авторизованной кассе Сбера.")
                  }
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Получение наличных BYN</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                {can("order_cash") ? (
                  <Link
                    href="/payments/order"
                    data-assistant-action="open-payment-order"
                    className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                  >
                    <span className="text-xs font-semibold text-sky-700 hover:underline">Заказ наличных денег</span>
                    <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                  </Link>
                ) : (
                  <span
                    className="flex items-center justify-between text-left w-full opacity-40 cursor-not-allowed"
                    title={denyTitle("order_cash")}
                  >
                    <span className="text-xs font-semibold text-sky-700">Заказ наличных денег</span>
                    <PlusCircle className="w-3.5 h-3.5 text-gray-300" />
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <button
                  onClick={() => alert("Заявка на получение наличных в USD / EUR по предварительной брони.")}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Получение наличной инвалюты</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>

                <button
                  onClick={() => alert("Заявка на безопасный взнос выручки через инкассацию Сбера.")}
                  className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
                >
                  <span className="text-xs font-semibold text-sky-700 hover:underline">Взнос наличной инвалюты</span>
                  <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              </div>
            </div>
          </div>
        </div>

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
                onClick={() => alert("Предоставление нормативных документов во исполнение внешнеторгового договора.")}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Документы для валютного контроля</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button
                onClick={() => {
                  const dealNum = prompt("Введите номер внешнеторговой сделки для регистрации:");
                  if (dealNum) alert(`Сделка № ${dealNum} отправлена на аудит валютного контроля.`);
                }}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Регистрация (перерегистрация) сделки</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button
                onClick={() => alert("Просмотр отчетов по репатриации валютной выручки.")}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">
                  Сведения о поступивших денежных средствах по валютной операции
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
              <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
                <Scale className="w-5.5 h-5.5 stroke-[1.8]" />
              </div>
              <div>
                <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">АИС ИДО</h3>
                <span className="text-[10px] text-gray-400 font-semibold uppercase">
                  Автоматизированная информационная система исполнения документов
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => alert("Формирование заявки на добровольную оплату неисполненных обязательств.")}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">
                  Заявления на оплату требований на взыскание средств в бесспорном порядке
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>

              <button
                onClick={() => alert("Запрос ведомости неисполненных обязательств. Статус: задолженностей не обнаружено.")}
                className="flex items-center justify-between text-left w-full hover:text-sky-600 focus:outline-none"
              >
                <span className="text-xs font-semibold text-sky-700 hover:underline">Ведомость неисполненных денежных обязательств в АИС ИДО</span>
                <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
