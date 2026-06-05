"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeftRight,
  CreditCard,
  FileText,
  CalendarDays,
  Briefcase,
  Handshake,
  MoreHorizontal,
  Settings,
  X,
} from "lucide-react";

export const BANKING_ROUTES: Record<string, string> = {
  money: "/",
  payments: "/payments",
  statement: "/statement",
  payroll: "/salary",
  products: "/products",
  services: "/services",
  other: "/other",
  settings: "/settings",
};

export function getActiveTab(pathname: string): string {
  if (pathname.startsWith("/payments")) return "payments";
  if (pathname.startsWith("/statement")) return "statement";
  if (pathname.startsWith("/salary")) return "payroll";
  if (pathname.startsWith("/products")) return "products";
  if (pathname.startsWith("/services")) return "services";
  if (pathname.startsWith("/other")) return "other";
  if (pathname.startsWith("/settings")) return "settings";
  return "money";
}

interface SidebarProps {
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

export default function Sidebar({ mobileOpen, setMobileOpen }: SidebarProps) {
  const pathname = usePathname();
  const activeTab = getActiveTab(pathname);

  const menuItems = [
    { id: "money", name: "Деньги и события", icon: ArrowLeftRight },
    { id: "payments", name: "Расчеты", icon: CreditCard },
    { id: "statement", name: "Выписка", icon: FileText },
    { id: "payroll", name: "Зарплата", icon: CalendarDays, hasBadge: true, badgeText: "1" },
    { id: "products", name: "Продукты и услуги", icon: Briefcase },
    { id: "services", name: "Сервисы", icon: Handshake },
    { id: "other", name: "Прочее", icon: MoreHorizontal },
  ];

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-gray-200 w-full shrink-0 relative">
      <div className="flex-1 overflow-y-auto py-2">
        <nav className="space-y-[2px]">
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            const Icon = item.icon;
            const href = BANKING_ROUTES[item.id];
            return (
              <Link
                key={item.id}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`w-full group flex flex-col items-center justify-center py-4 px-2 border-l-[4px] font-sans transition-all relative ${
                  isActive
                    ? "bg-[#f4fbfc] border-[#138d8a] text-[#138d8a]"
                    : "bg-white hover:bg-gray-50 border-transparent text-gray-500 hover:text-[#138d8a]"
                }`}
              >
                {item.hasBadge && (
                  <span className="absolute top-3.5 right-6 bg-[#138d8a] text-white font-bold rounded-full w-4 h-4 text-[9px] flex items-center justify-center border-2 border-white">
                    {item.badgeText}
                  </span>
                )}
                <div className={`transition-transform duration-200 ${isActive ? "scale-105 text-[#138d8a]" : "text-gray-400 group-hover:text-[#138d8a]"}`}>
                  <Icon className="w-6 h-6 stroke-[1.8]" />
                </div>
                <span className={`text-[11px] mt-2 text-center font-medium leading-tight max-w-[76px] ${isActive ? "text-gray-900 font-semibold" : "text-gray-500 group-hover:text-[#138d8a]"}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      <div className="p-3 border-t border-gray-100 flex justify-center">
        <Link
          href={BANKING_ROUTES.settings}
          onClick={() => setMobileOpen(false)}
          className={`p-3 rounded-full transition-colors flex items-center justify-center hover:bg-slate-100 ${
            activeTab === "settings" ? "text-[#138d8a] bg-[#f4fbfc]" : "text-gray-400 hover:text-[#138d8a]"
          }`}
          title="Параметры и настройки"
        >
          <Settings className="w-6 h-6 stroke-[1.8]" />
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex md:w-[130px] md:flex-col md:fixed md:inset-y-0 md:top-16 z-40">
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden" onClick={() => setMobileOpen(false)} />
      )}

      <div
        className={`fixed inset-y-0 left-0 z-50 w-[130px] transform bg-white transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-2 border-b border-gray-200 flex justify-end">
          <button onClick={() => setMobileOpen(false)} className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex-1">{sidebarContent}</div>
      </div>
    </>
  );
}

export function getSubHeaderTitle(tab: string): string {
  switch (tab) {
    case "money":
      return "Деньги и события";
    case "payments":
      return "Расчеты";
    case "statement":
      return "Выписка";
    case "payroll":
      return "Зарплата";
    case "products":
      return "Продукты и услуги";
    case "services":
      return "Сервисы";
    case "other":
      return "Прочее";
    case "settings":
      return "Настройки кабинета";
    default:
      return "Сбербанк Бизнес";
  }
}
