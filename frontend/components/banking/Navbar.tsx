"use client";

import { useState, useRef, useEffect } from "react";
import { Phone, Bell, MessageSquare, HelpCircle, ChevronDown, LogOut } from "lucide-react";
import { SberBrandLogo } from "@/components/banking/SberBrandLogo";

interface NavbarProps {
  notificationsCount: number;
  messagesCount: number;
  companyName: string;
  userInitials?: string;
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
  userInitials = "ЮЛ",
}: NavbarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <header className="sticky top-0 z-50 w-full bg-white border-b border-gray-200 shadow-sm px-6 h-16 flex items-center justify-between">
      <SberBrandLogo />

      <div className="flex items-center gap-5">
        <button
          onClick={onOpenPhoneSupport}
          className="p-2 text-gray-400 hover:text-emerald-700 hover:bg-gray-50 rounded-full transition-colors relative group"
          title="Служба поддержки"
        >
          <Phone className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
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
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
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
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Письма ({messagesCount})
          </span>
        </button>

        <div className="relative flex items-center gap-3" ref={menuRef}>
          <div className="relative w-8 h-8 rounded-full overflow-hidden border border-gray-200 flex items-center justify-center bg-emerald-50 shrink-0">
            <div className="absolute inset-0 bg-[#0f3227] flex items-center justify-center text-emerald-400 text-[10px] font-bold">
              {userInitials}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border border-white rounded-full" />
          </div>
          <div className="hidden md:flex flex-col text-left">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-1.5 text-[#2c3e50] hover:text-[#138d8a] transition-colors font-medium text-xs leading-none"
            >
              <span className="font-bold uppercase tracking-wider text-xs max-w-[180px] truncate">{companyName}</span>
              <ChevronDown className="w-3.5 h-3.5 text-gray-400 stroke-[2.5]" />
            </button>
            <span className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">ДЕМО-ДОСТУП</span>
          </div>
          {menuOpen && onLogout && (
            <div className="absolute top-full right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onLogout();
                }}
                className="w-full px-4 py-2 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <LogOut className="w-3.5 h-3.5" />
                Выйти
              </button>
            </div>
          )}
        </div>

        <div className="h-6 w-[1px] bg-gray-200" />

        <button className="p-2 text-gray-400 hover:bg-gray-50 rounded-full transition-colors relative group" title="Справка">
          <HelpCircle className="w-5 h-5 stroke-[1.8]" />
          <span className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-[10px] px-2 py-0.5 rounded shadow opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
            Справка
          </span>
        </button>
      </div>
    </header>
  );
}
