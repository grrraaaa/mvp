import React from 'react';
import { BookOpen, Scale, HelpCircle } from 'lucide-react';

export default function OtherView() {
  return (
    <div className="space-y-6 font-sans select-none animate-fadeIn">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Прочее</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Справочные материалы, комплаенс-рекомендации и законы
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-3.5">
          <BookOpen className="w-6 h-6 text-sber-green" />
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">База знаний бизнеса</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Инструкции по заполнению валютных справок, прохождению таможенных деклараций в Республике Беларусь.
          </p>
          <a href="#docs" onClick={(e) => { e.preventDefault(); alert('Перенаправление в базу знаний ОАО «Сбер Банк»...'); }} className="text-xs font-bold text-sky-700 hover:underline inline-block">Читать статьи →</a>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-3.5">
          <Scale className="w-6 h-6 text-amber-600" />
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Юрист комплаенс</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Бесплатная экспресс-консультация штатных юристов Сбербанка перед совершением крупных экспортных контрактов.
          </p>
          <button onClick={() => alert('Заявка на экспресс юридическую консультацию подана!')} className="text-xs font-bold text-sber-green hover:underline inline-block">Запросить звонок юриста</button>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-3.5">
          <HelpCircle className="w-6 h-6 text-sky-600" />
          <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Помощь и FAQ</h3>
          <p className="text-xs text-gray-500 leading-relaxed">
            Часто задаваемые вопросы по работе интернет-банкинга, настройке ЭЦП подписи, ключей аутентификации.
          </p>
          <a href="#faq" onClick={(e) => { e.preventDefault(); alert('Открытие Справочного Руководства...'); }} className="text-xs font-bold text-sky-700 hover:underline inline-block">Открыть руководство</a>
        </div>

      </div>
    </div>
  );
}
