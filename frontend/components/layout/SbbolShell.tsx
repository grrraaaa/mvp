"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
import { SberBusinessLogo } from "@/components/sbbol/SberBusinessLogo";
import {
  IconBell,
  IconChevronDown,
  IconMail,
  IconPhone,
  IconPlanet,
  NavIcon,
} from "@/components/sbbol/SbbolIcons";
import { MAIN_NAV, SUB_NAV, type NavId } from "@/lib/sbbol/navigation";
import { MOCK_ORG_NAME } from "@/lib/sbbol/mockSbbolData";
import { showStubToast } from "@/lib/sbbol/stubToast";

interface Props {
  children: ReactNode;
  onOpenMap: () => void;
  activeNav?: NavId;
}

export function SbbolShell({ children, onOpenMap, activeNav }: Props) {
  const pathname = usePathname();
  const current =
    activeNav ??
    (MAIN_NAV.find((n) =>
      n.href === "/" ? pathname === "/" : pathname === n.href || pathname.startsWith(`${n.href}/`)
    )?.id ?? "moneyAndEvents");

  const [menuExpanded, setMenuExpanded] = useState(false);
  const [hoverNav, setHoverNav] = useState<NavId | null>(null);

  return (
    <div className="sbbol-app min-h-screen flex flex-col bg-sbbol-bg text-sbbol-text">
      <header className="fixed top-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-sm border-b border-sbbol-border shadow-[0_1px_0_rgba(27,39,51,0.04)]">
        <div className="h-[65px] flex items-center px-2 lg:pl-2 lg:pr-[42px] gap-2">
          <button
            type="button"
            className="lg:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 ml-1"
            aria-label="Меню"
            onClick={() => setMenuExpanded((v) => !v)}
          >
            <span className="block w-5 h-0.5 bg-[#565b62]" />
            <span className="block w-5 h-0.5 bg-[#565b62]" />
            <span className="block w-5 h-0.5 bg-[#565b62]" />
          </button>

          <Link href="/" className="shrink-0 ml-1 lg:ml-0">
            <SberBusinessLogo className="h-[35px] w-auto" />
          </Link>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button type="button" className="sbbol-icon-btn hidden sm:flex" aria-label="Поддержка" onClick={() => showStubToast("Служба поддержки — демо-режим")}>
              <IconPhone />
            </button>
            <button type="button" className="sbbol-icon-btn hidden sm:flex" aria-label="Уведомления" onClick={() => showStubToast("Уведомления — демо-режим")}>
              <IconBell />
            </button>
            <button type="button" className="sbbol-icon-btn relative" aria-label="Сообщения" onClick={() => showStubToast("Входящие сообщения — демо-режим")}>
              <IconMail />
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-[#d64545] text-white text-[10px] font-semibold flex items-center justify-center">
                1
              </span>
            </button>
            <button
              type="button"
              onClick={onOpenMap}
              className="hidden md:flex items-center gap-1.5 h-10 px-3 rounded-lg border border-sbbol-border text-sbbol-primary text-sm font-semibold hover:bg-[#e5fcf7] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sbbol-primary/35"
            >
              <IconPlanet />
              <span>Карта услуг</span>
            </button>
            <button
              type="button"
              className="flex items-center gap-2 h-10 pl-1 pr-2 rounded-md hover:bg-[#f2f4f7] transition-colors max-w-[220px]"
            >
              <span className="w-8 h-8 rounded-full bg-[#90d0cc] flex items-center justify-center text-xs font-semibold text-[#005e7f] shrink-0">
                D
              </span>
              <span className="hidden sm:block text-xs font-semibold text-left leading-tight truncate">
                {MOCK_ORG_NAME}
              </span>
              <IconChevronDown />
            </button>
          </div>
        </div>
      </header>

      <aside
        className={`fixed top-[65px] left-0 bottom-0 z-30 w-[100px] sm:w-[104px] bg-white border-r border-sbbol-border flex flex-col shadow-[2px_0_12px_rgba(27,39,51,0.04)] ${
          menuExpanded ? "flex" : "hidden lg:flex"
        }`}
      >
        <nav className="flex flex-col flex-1 py-0">
          {MAIN_NAV.map((item) => {
            const isActive = current === item.id;
            return (
              <div
                key={item.id}
                className="relative"
                onMouseEnter={() => setHoverNav(item.id)}
                onMouseLeave={() => setHoverNav(null)}
              >
                <Link
                  href={item.href}
                  onClick={() => setMenuExpanded(false)}
                  className={`sbbol-nav-item ${isActive ? "sbbol-nav-item-active" : ""}`}
                  data-name={item.id}
                >
                  <NavIcon id={item.id} active={isActive} />
                  <span className={`sbbol-nav-label ${item.twoLines ? "leading-[1.15]" : ""}`}>
                    {item.label}
                  </span>
                </Link>

                {hoverNav === item.id && SUB_NAV[item.id].length > 0 && (
                  <div className="hidden lg:block absolute left-[104px] top-0 z-50 w-[300px] bg-white border border-[#d0d7dd] rounded-xl shadow-[0_12px_24px_rgba(27,39,51,0.08)] py-3">
                    <p className="px-4 pb-2 text-sm font-semibold text-[#1f1f22]">{item.label}</p>
                    <ul>
                      {SUB_NAV[item.id].map((sub) => (
                        <li key={sub.href}>
                          <Link
                            href={sub.href === "/products/map" ? "#" : sub.href}
                            onClick={(e) => {
                              if (sub.href === "/products/map") {
                                e.preventDefault();
                                onOpenMap();
                              }
                              setMenuExpanded(false);
                            }}
                            className="block px-4 py-2 text-sm text-[#565b62] hover:bg-[#f2f4f7] hover:text-[#107f8c] transition-colors"
                          >
                            {sub.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="p-2 pb-4 lg:hidden">
          <button
            type="button"
            onClick={onOpenMap}
            className="w-full flex flex-col items-center gap-1 py-2 text-[10px] text-[#107f8c] font-medium"
          >
            <IconPlanet />
            Карта
          </button>
        </div>
      </aside>

      {menuExpanded && (
        <button
          type="button"
          className="fixed inset-0 top-[65px] z-20 bg-[rgba(31,31,34,0.5)] lg:hidden"
          aria-label="Закрыть меню"
          onClick={() => setMenuExpanded(false)}
        />
      )}

      <main className="flex-1 pt-[65px] pl-0 lg:pl-[104px] min-h-0 min-w-0 overflow-x-hidden">{children}</main>

      <footer
        suppressHydrationWarning
        className="flex-shrink-0 pl-0 lg:pl-[104px] py-6 px-4 sm:px-6 lg:px-10 text-xs sm:text-sm text-sbbol-muted flex flex-wrap gap-x-6 gap-y-2"
      >
        <a href="https://www.sber-bank.by" target="_blank" rel="noopener noreferrer" className="hover:text-[#107f8c]">
          www.sber-bank.by
        </a>
        <a href="https://www.sber-bank.by" target="_blank" rel="noopener noreferrer" className="hover:text-[#107f8c]">
          Политика обработки персональных данных
        </a>
      </footer>
    </div>
  );
}
