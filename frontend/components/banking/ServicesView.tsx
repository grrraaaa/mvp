"use client";

import React from "react";
import { Sparkles, Smartphone } from "lucide-react";
import { runBankingAction } from "@/lib/banking/actionRegistry";

export default function ServicesView() {
  return (
    <div className="space-y-6 font-sans select-none">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Вспомогательные сервисы</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Интеллектуальные облачные технологии Сбер Бизнес
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Бизнес-аналитика</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase">ИИ-сводки и прогнозы</span>
            </div>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed">
            Спросите ассистента: «Покажи расходы за месяц», «Сравни февраль и март», «Прогноз кассового разрыва».
            Данные берутся из выписки вашей организации в PostgreSQL.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
              <Smartphone className="w-5 h-5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Sber Мобильная онлайн-касса</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Приём платежей через NFC</span>
            </div>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed">
            Принимайте безналичные платежи с корпоративного смартфона. Комиссия от 1,2%.
          </p>
          <button
            type="button"
            onClick={() => void runBankingAction("connect-softpos")}
            className="text-xs font-bold text-[#138d8a] hover:underline bg-teal-50/50 border border-teal-100 px-3 py-1.5 rounded"
          >
            Подключить сервис
          </button>
        </div>
      </div>
    </div>
  );
}
