"use client";

import { useState, useRef, useEffect } from "react";
import { Phone, Bell, MessageSquare, HelpCircle, ChevronDown, LogOut } from "lucide-react";
import { SberBrandLogo } from "@/components/banking/SberBrandLogo";
import { useRole } from "@/store/roleStore";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import { RoleSelector } from "@/components/banking/RoleSelector";

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
  const { role } = useRole();
  const { openChat } = useSbbolUi();
  const [profileOpen, setProfileOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!profileOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [profileOpen]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm px-3 sm:px-6 h-16 flex items-center justify-between gap-2">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        <SberBrandLogo />
        <div className="hidden md:block h-6 w-[1px] bg-gray-200" />
        <div className="md:hidden">
          <RoleSelector onLogout={onLogout} iconOnly />
        </div>
        <div className="hidden md:block">
          <RoleSelector onLogout={onLogout} />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
        <button
          onClick={openChat}
          className="flex items-center gap-1.5 px-2 sm:px-3.5 py-1.5 z-15 border border-gray-200 hover:border-gray-300 bg-white hover:bg-gray-50 text-gray-700 rounded-full transition-all text-xs font-semibold focus:outline-none shrink-0 cursor-pointer shadow-sm"
          title="Интеллектуальный ИИ-ассистент"
          aria-label="ИИ-ассистент"
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
          className="hidden md:flex p-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded-full transition-colors relative group"
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
          className="hidden md:flex p-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded-full transition-colors relative group"
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
            onClick={() => setProfileOpen((prev) => !prev)}
            className="flex items-center gap-3 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors focus:outline-none"
            title="Профиль"
            aria-label="Профиль"
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
                  className={`w-3.5 h-3.5 text-gray-400 stroke-[2.5] transition-transform ${profileOpen ? "rotate-180" : ""}`}
                />
              </span>
              <span className="text-[10px] text-sber-green font-bold mt-0.5 uppercase tracking-wide">
                {role.fullName} · {role.initials}
              </span>
            </div>
          </button>

          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl w-[min(18rem,calc(100vw-1.5rem))] z-50 overflow-hidden animate-fadeIn">
              <div className="px-4 py-3 border-b border-gray-100 bg-slate-50 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-sber-green shrink-0">
                  <img
                    src={role.portrait}
                    alt={role.fullName}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "50% 18%" }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-800 truncate">{role.fullName}</div>
                  <div className="text-[10px] font-bold text-sber-green uppercase tracking-wider">
                    {role.position}
                  </div>
                </div>
              </div>

              {onLogout && (
                <div>
                  <button
                    type="button"
                    onClick={() => {
                      setProfileOpen(false);
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
                Права меняйте через «Права доступа» в шапке
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
