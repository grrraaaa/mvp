import React from 'react';
import { Sparkles, Terminal, Smartphone, CalendarDays, CheckCircle2 } from 'lucide-react';
import { useRole } from '../RoleContext';

export default function ServicesView() {
  const { can, denyTitle } = useRole();
  return (
    <div className="space-y-6 font-sans select-none">
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Вспомогательные сервисы</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Интеллектуальные облачные технологии Сбер Бизнес
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service 1 */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="p-2.5 bg-sky-50 rounded-lg text-sky-600">
              <Terminal className="w-5.5 h-5.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Sber Open API</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Синхронизация ERP учетных баз</span>
            </div>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed">
            Автоматическая выгрузка транзакций Сбера напрямую в вашу 1С учетную запись или ERP систему. Интеграция по защищенному крипто-протоколу TLS.
          </p>
          <button
            onClick={() => alert('Сформированы секретные ключи Sber Open API. Документация выслана на ваш почтовый ящик!')}
            disabled={!can('manage_services')}
            title={can('manage_services') ? undefined : denyTitle('manage_services')}
            className="text-xs font-bold text-sky-700 hover:underline bg-slate-50 border px-3 py-1.5 rounded disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed disabled:hover:no-underline"
          >
            Сгенерировать API ключи
          </button>
        </div>

        {/* Service 2 */}
        <div className="bg-white rounded-2xl border border-gray-150 p-6 shadow-xs space-y-4">
          <div className="flex items-center gap-3 border-b pb-3">
            <span className="p-2.5 bg-indigo-50 rounded-lg text-indigo-600">
              <Smartphone className="w-5.5 h-5.5" />
            </span>
            <div>
              <h3 className="font-extrabold text-sm text-gray-800 uppercase tracking-wide">Sber Мобильная онлайн-касса</h3>
              <span className="text-[10px] text-gray-400 font-bold uppercase">Прием платежей через NFC смартфона</span>
            </div>
          </div>
          <p className="text-xs text-gray-550 leading-relaxed">
            Принимайте рублевые безналичные платежи от розничных покупателей прямо на корпоративный смартфон с технологией SoftPOS! Комиссия снижена до 1.2%.
          </p>
          <button
            onClick={() => alert('Ссылка активации SoftPOS направлена администратору зарплатного проекта.')}
            disabled={!can('manage_services')}
            title={can('manage_services') ? undefined : denyTitle('manage_services')}
            className="text-xs font-bold text-[#138d8a] hover:underline bg-teal-50/50 border border-teal-100 px-3 py-1.5 rounded disabled:text-gray-400 disabled:no-underline disabled:cursor-not-allowed disabled:hover:no-underline"
          >
            Подключить сервис бесплатно
          </button>
        </div>
      </div>
    </div>
  );
}
