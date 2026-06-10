"use client";

import { useState, type FormEvent } from 'react';
import { 
  Key, 
  ShieldAlert, 
  Check, 
  Bell, 
  Lock,
  Smartphone,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useRole } from "@/store/roleStore";

export default function SettingsView() {
  const { can, denyTitle } = useRole();
  const canManage = can("manage_security");
  const [phoneAlert, setPhoneAlert] = useState('+375 29 111-22-33');
  const [sessionTimeout, setSessionTimeout] = useState('15');
  const [smsSberConfirm, setSmsSberConfirm] = useState(true);
  const [ipWhitelist, setIpWhitelist] = useState('192.168.1.100');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 text-left max-w-4xl font-sans select-none">
      {/* Title */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 leading-tight">Профиль и Настройки Безопасности</h1>
        <p className="text-xs text-gray-400 mt-1 uppercase font-semibold tracking-wider">
          Управление доступом, лимитами аутентификации ЭЦП Сбербанка
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Navigation panel */}
        <div className="space-y-[2px] md:col-span-1 bg-white border border-gray-150 rounded-xl p-3 h-fit">
          <div className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-gray-400">
            Разделы системы
          </div>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg bg-[#f4fbfc] text-[#138d8a] text-xs font-bold text-left border-l-[3px] border-[#138d8a]">
            <Lock className="h-4 w-4" />
            <span>Параметры безопасности</span>
          </button>
          <button onClick={() => alert('Настройка криптозащиты и ЭЦП доступна только при наличии Сбер Токена.')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#138d8a] hover:bg-slate-50 text-left">
            <Key className="h-4 w-4 text-gray-400" />
            <span>Сертификаты ЭЦП</span>
          </button>
          <button onClick={() => alert('Управление уведомлениями подключено к вашему мобильному приложению Сбербанк Бизнес.')} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-semibold text-gray-500 hover:text-[#138d8a] hover:bg-slate-50 text-left">
            <Bell className="h-4 w-4 text-gray-400" />
            <span>СМС Оповещения</span>
          </button>
        </div>

        {/* Content columns */}
        <form onSubmit={handleSave} className="md:col-span-2 space-y-6">
          
          {/* Card 1: SMS confirmation policies */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b pb-2">
              Аутентификация транзакций
            </h3>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 text-xs">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase block">Телефон для СМС-паролей</label>
                <input
                  type="text"
                  value={phoneAlert}
                  onChange={(e) => setPhoneAlert(e.target.value)}
                  disabled={!canManage}
                  title={canManage ? undefined : denyTitle("manage_security")}
                  className="w-full border border-gray-300 rounded-lg p-2 font-bold disabled:bg-slate-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-gray-500 uppercase block">Время авторазлогина (мин)</label>
                <select
                  value={sessionTimeout}
                  onChange={(e) => setSessionTimeout(e.target.value)}
                  disabled={!canManage}
                  title={canManage ? undefined : denyTitle("manage_security")}
                  className="w-full border border-gray-300 rounded-lg p-2.5 font-bold bg-white text-gray-700 disabled:bg-slate-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                >
                  <option value="5">5 минут</option>
                  <option value="15">15 минут</option>
                  <option value="30">30 минут</option>
                  <option value="60">1 час</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between py-2 border-t pt-4">
              <div className="space-y-0.5 text-xs text-left">
                <span className="font-extrabold text-gray-805 flex items-center gap-1.5">
                  <Smartphone className="h-4 w-4 text-[#138d8a]" />
                  <span>СМС подтверждение каждой проводки</span>
                </span>
                <p className="text-[10px] text-gray-400">Требовать одноразовый OTP код при отправке клиринга бенефициарам</p>
              </div>
              <label className={`relative inline-flex items-center ${canManage ? "cursor-pointer" : "cursor-not-allowed opacity-50"}`} title={canManage ? undefined : denyTitle("manage_security")}>
                <input
                  type="checkbox"
                  checked={smsSberConfirm}
                  onChange={(e) => setSmsSberConfirm(e.target.checked)}
                  disabled={!canManage}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:width-5 after:transition-all peer-checked:bg-[#138d8a]" />
              </label>
            </div>
          </div>

          {/* Card 2: IP access restrict */}
          <div className="bg-white rounded-2xl border border-gray-150 p-6 space-y-4">
            <h3 className="text-xs font-black text-gray-800 uppercase tracking-widest border-b pb-2">
              Защита по сетевому адресу (IP)
            </h3>
            <p className="text-xs text-gray-500 leading-relaxed">
              Ограничьте доступ в банковский кабинет Сбера только с фиксированных офисных IP адресов вашей компании для подавления фишинговых угроз.
            </p>

            <div className="space-y-1 text-xs">
              <label className="text-[10px] font-bold text-gray-500 uppercase block">Белый список IP адресов</label>
              <input
                type="text"
                value={ipWhitelist}
                onChange={(e) => setIpWhitelist(e.target.value)}
                placeholder="например, 178.120.21.32"
                disabled={!canManage}
                title={canManage ? undefined : denyTitle("manage_security")}
                className="w-full border border-gray-300 rounded-lg p-2 font-mono font-semibold disabled:bg-slate-50 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
            </div>

            <div className="bg-amber-50 rounded-xl border border-amber-150 p-3.5 flex items-start gap-2.5 text-xs text-amber-800">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold">Меры предосторожности:</span>
                <p className="text-[10px] leading-relaxed">
                  Будьте внимательны. Ввод ошибочного IP адреса заблокирует вход в банк с других устройств. Для сброса потребуется подать бумажное заявление в филиал ОАО «Сбер Банк».
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={!canManage}
              title={canManage ? undefined : denyTitle("manage_security")}
              className="px-6 py-2.5 bg-[#128e8b] hover:bg-[#107c79] text-white text-xs font-bold rounded-lg transition shadow-md active:scale-95 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:shadow-none"
            >
              Сохранить параметры безопасности
            </button>

            {saveSuccess && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-150 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-bold animate-fadeIn">
                <Check className="w-3.5 h-3.5" />
                <span>Настройки сохранены в Сбере!</span>
              </div>
            )}
          </div>

        </form>

      </div>
    </div>
  );
}
