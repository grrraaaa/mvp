"use client";

import Link from "next/link";
import { BookOpen, Scale, HelpCircle, FileSearch, ChevronRight, GraduationCap } from "lucide-react";

export default function OtherView() {
  return (
    <div className="space-y-6 font-sans select-none animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Прочее</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Документы, справочники и запросы информации по счетам
        </p>
      </div>

      <Link
        href="/learning"
        data-assistant-action="open-learning"
        className="flex items-center gap-4 rounded-2xl p-5 text-white shadow-sm hover:opacity-95 transition-opacity"
        style={{ background: "linear-gradient(100deg, #138d8a 0%, #2c9faf 60%, #5bb5c9 100%)" }}
      >
        <span className="p-2.5 bg-white/15 rounded-xl shrink-0">
          <GraduationCap className="w-6 h-6" />
        </span>
        <span className="flex-1">
          <span className="block font-extrabold text-sm uppercase tracking-wide">Обучающий модуль</span>
          <span className="block text-xs text-white/85 mt-0.5">
            Интерактивный курс: платежи, выписка, зарплата, безопасность — с прогрессом и подсказками консультанта
          </span>
        </span>
        <ChevronRight className="w-5 h-5 shrink-0" />
      </Link>

      <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs">
        <div className="flex items-center gap-3 border-b pb-3.5 mb-4">
          <div className="p-2.5 bg-emerald-50 rounded-xl text-[#138d8a]">
            <FileSearch className="w-5.5 h-5.5 stroke-[1.8]" />
          </div>
          <div>
            <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider">
              Запросы информации
            </h3>
            <span className="text-[10px] text-gray-400 font-semibold uppercase">
              Выписки, остатки, справки по счетам и операциям
            </span>
          </div>
        </div>
        <Link
          href="/other/info-requests"
          data-assistant-action="open-info-requests"
          className="w-full text-left flex items-center justify-between text-sky-700 hover:underline font-semibold text-xs"
        >
          <span>Запросы выписки, информации</span>
          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-3.5">
          <BookOpen className="w-6 h-6 text-[#138d8a]" />
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">База знаний бизнеса</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Инструкции по заполнению валютных справок, прохождению таможенных деклараций в Республике Беларусь.
          </p>
          <Link href="/other/directories" className="text-xs font-bold text-sky-700 hover:underline inline-block">
            Справочники →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-3.5">
          <Scale className="w-6 h-6 text-amber-600" />
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Юрист комплаенс</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Бесплатная экспресс-консультация штатных юристов Сбербанка перед совершением крупных экспортных контрактов.
          </p>
          <Link href="/other/more" className="text-xs font-bold text-[#138d8a] hover:underline inline-block">
            Дополнительное меню →
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-3.5">
          <HelpCircle className="w-6 h-6 text-sky-600" />
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Помощь и FAQ</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Часто задаваемые вопросы по работе интернет-банкинга, настройке ЭЦП подписи, ключей аутентификации.
          </p>
          <Link href="/learning" className="text-xs font-bold text-sky-700 hover:underline inline-block">
            Обучение и помощь →
          </Link>
        </div>
      </div>
    </div>
  );
}
