"use client";

import { useState, useRef, useEffect } from "react";
import { Phone, Bell, MessageSquare, HelpCircle, ChevronDown, Check, LogOut } from "lucide-react";
import { SberBrandLogo } from "@/components/banking/SberBrandLogo";
import { ROLES, ROLE_ORDER } from "@/lib/banking/roles";
import { useRole } from "@/store/roleStore";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";

interface NavbarProps {
  notificationsCount: number;
  messagesCount: number;
  companyName: string;
  onOpenPhoneSupport: () => void;
  onOpenNotifications: () => void;
  onOpenMessages: () => void;
  onLogout?: () => void;
}

export default function Navbar({
  notificationsCount,
  messagesCount,
  companyName,
  onOpenPhoneSupport,
  onOpenNotifications,
  onOpenMessages,
  onLogout,
}: NavbarProps) {
  const { role, roleId, setRoleId } = useRole();
  const { openChat } = useSbbolUi();
  const [roleMenuOpen, setRoleMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!roleMenuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setRoleMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [roleMenuOpen]);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
      <SberBrandLogo />

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          onClick={openChat}
          className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 z-15 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-full transition-all text-xs font-semibold focus:outline-none shrink-0 cursor-pointer shadow-sm"
          title="Интеллектуальный ИИ-ассистент"
        >
          <div className="relative flex items-center justify-center">
            <svg
              className="w-[18px] h-[18px] flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <circle cx="12" cy="12" r="10" fill="#108c7c" />
              <path
                d="M12 7.5L13.1 10.9L16.5 12L13.1 13.1L12 16.5L10.9 13.1L7.5 12L10.9 10.9L12 7.5Z"
                fill="white"
              />
              <circle
                cx="16.5"
                cy="7.5"
                r="1.8"
                fill="#21A038"
                stroke="white"
                strokeWidth="0.8"
              />
            </svg>
          </div>
          <span className="font-sans font-medium text-gray-700 leading-none hidden sm:inline">
            ИИ-ассистент
          </span>
        </button>

        <button
          onClick={onOpenPhoneSupport}
          className="hidden sm:flex p-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded-full transition-colors relative group"
          title="Служба поддержки"
        >
          <Phone className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-850 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Поддержка
          </span>
        </button>

        <button
          onClick={onOpenNotifications}
          className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded-full transition-colors relative group"
          title="Уведомления"
        >
          <Bell className="w-5 h-5 stroke-[1.8]" />
          {notificationsCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          )}
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-850 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Уведомления
          </span>
        </button>

        <button
          onClick={onOpenMessages}
          className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded-full transition-colors relative group"
          title="Почтовые сообщения"
        >
          <MessageSquare className="w-5 h-5 stroke-[1.8]" />
          {messagesCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white leading-none">
              {messagesCount}
            </span>
          )}
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-850 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Письма ({messagesCount})
          </span>
        </button>

        <div className="hidden sm:block h-6 w-[1px] bg-gray-200" />

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setRoleMenuOpen((prev) => !prev)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors focus:outline-none"
            title="Переключить роль пользователя"
          >
            <div className="relative w-9 h-9 rounded-full overflow-hidden border-2 border-sber-green/30 bg-white shrink-0 select-none shadow-sm">
              <img
                src={role.portrait}
                alt={role.fullName}
                className="absolute inset-0 w-full h-full object-cover object-top"
                style={{ objectPosition: "50% 18%" }}
              />
              <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full" />
            </div>

            <div className="hidden md:flex flex-col text-left">
              <span className="flex items-center gap-1.5 text-[#2c3e50] font-medium text-xs leading-none">
                <span className="font-bold uppercase tracking-wider text-xs max-w-[180px] truncate">{companyName}</span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-gray-400 stroke-[2.5] transition-transform ${roleMenuOpen ? "rotate-180" : ""}`}
                />
              </span>
              <span className="text-[10px] text-sber-green font-bold mt-0.5 uppercase tracking-wide">
                {role.position} · {role.initials}
              </span>
            </div>
          </button>

          {roleMenuOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl w-[min(20rem,calc(100vw-1.5rem))] z-50 overflow-hidden animate-fadeIn">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
                <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">Выберите роль (демо)</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Доступ к разделам и кнопкам зависит от роли</div>
              </div>

              <div className="py-1">
                {ROLE_ORDER.map((id) => {
                  const r = ROLES[id];
                  const isActive = roleId === id;
                  return (
                    <button
                      key={id}
                      onClick={() => {
                        setRoleId(id);
                        setRoleMenuOpen(false);
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-emerald-50/40 focus:outline-none ${
                        isActive ? "bg-emerald-50/60" : ""
                      }`}
                    >
                      <div
                        className={`relative w-12 h-12 rounded-full overflow-hidden bg-white shrink-0 border-2 transition-colors ${
                          isActive ? "border-sber-green" : "border-gray-200"
                        }`}
                      >
                        <img
                          src={r.portrait}
                          alt={r.fullName}
                          className="absolute inset-0 w-full h-full object-cover"
                          style={{ objectPosition: "50% 18%" }}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-gray-800 truncate">{r.fullName}</span>
                          {isActive && <Check className="w-4 h-4 text-sber-green shrink-0" />}
                        </div>
                        <div className="text-[10px] font-bold text-sber-green uppercase tracking-wider mt-0.5">{r.position}</div>
                        <div className="text-[10px] text-gray-500 leading-snug mt-1">{r.description}</div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {onLogout && (
                <div className="border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => {
                      setRoleMenuOpen(false);
                      onLogout();
                    }}
                    className="w-full px-4 py-2.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Выйти
                  </button>
                </div>
              )}

              <div className="px-4 py-2 border-t border-gray-100 bg-slate-50 text-[9px] text-gray-400 uppercase tracking-wider font-semibold">
                Демо-доступ · ОАО «Сбер Банк»
              </div>
            </div>
          )}
        </div>

        <div className="hidden md:block h-6 w-[1px] bg-gray-200" />

        <button
          className="hidden md:flex p-2 text-gray-400 hover:text-brand hover:bg-gray-50 rounded-full transition-colors relative group"
          title="Справка"
        >
          <HelpCircle className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-850 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Справка
          </span>
        </button>
      </div>
    </header>
  );
}
