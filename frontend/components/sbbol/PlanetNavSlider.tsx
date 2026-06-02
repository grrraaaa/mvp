"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SBBOL_SLIDER_ITEMS } from "@/lib/sber/planetMap";

interface Props {
  onOpenMap?: () => void;
}

function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function PlanetNavSlider({ onOpenMap }: Props) {
  const pathname = usePathname();

  return (
    <div
      className="fixed top-[65px] left-0 right-0 z-30 bg-white/95 backdrop-blur-sm border-b border-sbbol-border shadow-[0_1px_0_rgba(27,39,51,0.04)] lg:pl-[104px]"
      aria-label="Навигация по разделам СберБизнес"
    >
      <div className="flex items-center gap-1 px-2 sm:px-4 py-2 overflow-x-auto scrollbar-thin">
        {SBBOL_SLIDER_ITEMS.map((item) => {
          const active = isActive(item.href, pathname);
          return (
            <Link
              key={item.id}
              href={item.href}
              className={`sbbol-planet-chip shrink-0 ${active ? "sbbol-planet-chip-active" : ""}`}
            >
              <span
                className="sbbol-planet-chip-orbit"
                style={{
                  background: `radial-gradient(circle at 30% 30%, ${item.color}, ${item.emissive})`,
                }}
                aria-hidden
              />
              <span className="sbbol-planet-chip-label">{item.label}</span>
            </Link>
          );
        })}
        {onOpenMap && (
          <button
            type="button"
            onClick={onOpenMap}
            className="sbbol-planet-chip shrink-0 ml-auto hidden sm:inline-flex border-dashed"
            title="3D-карта разделов"
          >
            <span className="sbbol-planet-chip-orbit bg-gradient-to-br from-[#107f8c] to-[#005e7f]" aria-hidden />
            <span className="sbbol-planet-chip-label">3D карта</span>
          </button>
        )}
      </div>
    </div>
  );
}
