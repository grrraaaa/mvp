"use client";

import type { BankProduct } from "@/store/assistantStore";

interface Props {
  products: BankProduct[];
}

const TYPE_LABELS: Record<string, string> = {
  credit: "Кредит",
  deposit: "Вклад",
  investment: "Инвестиции",
  cards: "Карты",
};

const TYPE_COLORS: Record<string, string> = {
  credit: "text-sber-green-light bg-sber-green/15 border-sber-border",
  deposit: "text-sber-gold bg-sber-gold/10 border-sber-gold/30",
  investment: "text-sber-green-light bg-sber-green/10 border-sber-border",
};

export function ProductCard({ products }: Props) {
  return (
    <div className="ml-10 mt-2 space-y-2">
      {products.map((p) => (
        <a
          key={p.id}
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          className="product-card-link block bg-sber-panel-elevated border border-sber-border rounded-xl p-3 hover:border-sber-green hover:bg-sber-green/5 transition-all group"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <span
                className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                  TYPE_COLORS[p.type] || "text-sber-muted bg-sber-green/10 border-sber-border"
                }`}
              >
                {TYPE_LABELS[p.type] || p.type}
              </span>
              <p className="text-sm font-medium text-white group-hover:text-sber-green-light transition-colors truncate mt-1">
                {p.name}
              </p>
              {p.description && (
                <p className="text-xs text-sber-muted mt-0.5 line-clamp-2">{p.description}</p>
              )}
              <p className="text-[10px] text-sber-green-light/80 mt-1 truncate">sber-bank.by ↗</p>
            </div>
            {p.rate != null && (
              <div className="text-right flex-shrink-0">
                <span className="text-lg font-bold text-sber-gold">{p.rate}%</span>
                <p className="text-xs text-sber-muted">
                  {p.type === "credit" ? "ставка*" : "доходность*"}
                </p>
              </div>
            )}
          </div>
        </a>
      ))}
      <p className="text-[10px] text-sber-muted/70 ml-1">* Уточняйте на официальном сайте Сбера</p>
    </div>
  );
}
