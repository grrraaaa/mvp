"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { ProductItem } from "@/lib/banking/productCatalog";
import { bankingToast } from "@/lib/banking/toast";

interface Props {
  item: ProductItem;
}

export default function ProductLandingView({ item }: Props) {
  return (
    <div className="font-sans -mx-4 sm:-mx-6 lg:-mx-8">
      <div className="bg-[#2d9494] text-white px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 max-w-6xl mx-auto">
          <Link href="/products" className="shrink-0 p-1 hover:bg-white/10 rounded" aria-label="Назад">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <p className="text-xs text-white/70 uppercase tracking-wide">{item.category}</p>
            <h1 className="text-base sm:text-lg font-semibold">{item.label}</h1>
          </div>
        </div>
      </div>

      <div className="bg-[#f4f6f8] min-h-[360px] px-4 sm:px-6 py-8">
        <div className="max-w-2xl mx-auto bg-white rounded-xl border border-gray-200 p-6 shadow-sm space-y-4">
          <p className="text-sm text-gray-600 leading-relaxed">
            Раздел «{item.label}» в интернет-банке СберБизнес. Здесь вы можете оформить заявку,
            просмотреть статус обращения и связаться с менеджером банка.
          </p>
          <button
            type="button"
            onClick={() =>
              bankingToast(`Заявка «${item.label}» принята в обработку`)
            }
            className="px-5 py-2.5 bg-[#2d9494] text-white text-sm font-semibold rounded hover:bg-[#268585]"
          >
            Создать заявку
          </button>
          <p className="text-xs text-gray-400">
            Демо-режим: данные сохраняются в вашем кабинете.
          </p>
        </div>
      </div>
    </div>
  );
}
