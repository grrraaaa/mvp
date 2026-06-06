"use client";

import Link from "next/link";
import type { BankProduct } from "@/store/assistantStore";
import { sanitizeSbbolUrl } from "@/lib/sbbol/sbbolLinks";

interface Props {
  products: BankProduct[];
}

const TYPE_LABELS: Record<string, string> = {
  credit: "Кредит",
  deposit: "Депозит",
  cards: "Карты",
};

const TYPE_COLORS: Record<string, string> = {
  credit: "text-sber-green-light bg-sber-green/15 border-sber-border",
  deposit: "text-sber-gold bg-sber-gold/10 border-sber-gold/30",
  cards: "text-sber-green-light bg-sber-green/10 border-sber-border",
};

function ProductLink({ product }: { product: BankProduct }) {
  const href = sanitizeSbbolUrl(product.url);
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <span
            className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
              TYPE_COLORS[product.type] || "text-sber-muted bg-sber-green/10 border-sber-border"
            }`}
          >
            {TYPE_LABELS[product.type] || product.type}
          </span>
          <p className="text-sm font-medium text-white group-hover:text-sber-green-light transition-colors truncate mt-1">
            {product.name}
          </p>
          {product.match_score != null && (
            <span className="inline-flex items-center gap-1 text-[10px] mt-1 px-2 py-0.5 rounded-full bg-sber-gold/15 text-sber-gold border border-sber-gold/30">
              Совпадение {product.match_score}%
            </span>
          )}
          {product.description && (
            <p className="text-xs text-sber-muted mt-0.5 line-clamp-2">{product.description}</p>
          )}
          <p className="text-[10px] text-sber-green-light/80 mt-1 truncate">СберБизнес →</p>
        </div>
        {product.rate != null && (
          <div className="text-right flex-shrink-0">
            <span className="text-lg font-bold text-sber-gold">{product.rate}%</span>
            <p className="text-xs text-sber-muted">
              {product.type === "credit" ? "ставка*" : "доходность*"}
            </p>
          </div>
        )}
      </div>
    </>
  );

  const className =
    "product-card-link block bg-sber-panel-elevated border border-sber-border rounded-xl p-3 hover:border-sber-green hover:bg-sber-green/5 transition-all group";

  if (href.startsWith("/")) {
    return (
      <Link href={href} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {inner}
    </a>
  );
}

export function ProductCard({ products }: Props) {
  return (
    <div className="ml-10 mt-2 space-y-2">
      {products.map((p) => (
        <ProductLink key={p.id} product={p} />
      ))}
      <p className="text-[10px] text-sber-muted/70 ml-1">
        * Уточняйте условия в разделе «Продукты и услуги» СберБизнес
      </p>
    </div>
  );
}
