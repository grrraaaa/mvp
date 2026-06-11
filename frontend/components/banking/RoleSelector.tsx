"use client";

import { useEffect, useRef, useState } from "react";
import { Shield, ChevronDown, Check, LogOut } from "lucide-react";
import { ROLES, ROLE_ORDER, PERMISSION_LABEL } from "@/lib/banking/roles";
import { useRole } from "@/store/roleStore";

interface Props {
  onLogout?: () => void;
  /** Скрыть подпись «Права» (оставить только чип). */
  compact?: boolean;
}

/** Топ-уровневый селектор роли (прав доступа) в навбаре. Виден сразу,
 *  не прячется в аватар. */
export function RoleSelector({ onLogout, compact }: Props) {
  const { role, roleId, setRoleId } = useRole();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const isActive = (id: string) => roleId === id;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="Права доступа"
        className={`flex items-center gap-1.5 sm:gap-2 px-2 sm:px-2.5 py-1.5 z-15 border bg-white rounded-full transition-all text-xs font-semibold focus:outline-none shrink-0 cursor-pointer shadow-sm ${
          open
            ? "border-sber-green text-sber-green"
            : "border-gray-200 hover:border-gray-300 text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Shield className="w-4 h-4 text-sber-green" />
        <span className="flex flex-col items-start leading-none">
          {!compact && (
            <span className="text-[8px] uppercase tracking-wider text-gray-400 font-bold">
              Права
            </span>
          )}
          <span className="text-[11px] font-bold uppercase tracking-wide">
            {role.position}
          </span>
        </span>
        <ChevronDown
          className={`w-3 h-3 text-gray-400 stroke-[2.5] transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 bg-white border border-gray-200 rounded-xl shadow-2xl w-[min(22rem,calc(100vw-1.5rem))] z-50 overflow-hidden animate-fadeIn"
          role="menu"
        >
          <div className="px-4 py-3 border-b border-gray-100 bg-slate-50">
            <div className="text-[10px] uppercase font-bold tracking-wider text-gray-500">
              Права доступа · демо
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">
              Доступ к разделам и кнопкам зависит от роли
            </div>
          </div>

          <div className="py-1">
            {ROLE_ORDER.map((id) => {
              const r = ROLES[id];
              const active = isActive(id);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    setRoleId(id);
                    setOpen(false);
                  }}
                  className={`w-full text-left transition-colors hover:bg-emerald-50/40 focus:outline-none ${
                    active ? "bg-emerald-50/60" : ""
                  }`}
                >
                  <div className="flex items-start gap-3 px-4 py-2.5">
                    <div
                      className={`relative w-10 h-10 rounded-full overflow-hidden bg-white shrink-0 border-2 transition-colors ${
                        active ? "border-sber-green" : "border-gray-200"
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
                        <span className="text-xs font-bold text-gray-800 truncate">
                          {r.fullName}
                        </span>
                        {active && <Check className="w-4 h-4 text-sber-green shrink-0" />}
                      </div>
                      <div className="text-[10px] font-bold text-sber-green uppercase tracking-wider mt-0.5">
                        {r.position}
                      </div>
                      <div className="text-[10px] text-gray-500 leading-snug mt-1">
                        {r.description}
                      </div>
                      <div className="mt-1.5 flex flex-wrap gap-1">
                        {r.permissions.slice(0, 3).map((p) => (
                          <span
                            key={p}
                            className="text-[9px] uppercase tracking-wider font-bold text-gray-500 bg-gray-100 border border-gray-200 rounded-full px-1.5 py-0.5"
                          >
                            {PERMISSION_LABEL[p]}
                          </span>
                        ))}
                        {r.permissions.length > 3 && (
                          <span className="text-[9px] uppercase tracking-wider font-bold text-gray-400 px-1.5 py-0.5">
                            +{r.permissions.length - 3}
                          </span>
                        )}
                      </div>
                    </div>
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
                  setOpen(false);
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
  );
}
