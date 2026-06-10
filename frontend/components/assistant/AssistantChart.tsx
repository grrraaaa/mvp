"use client";

import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import type { ChartSpec } from "@/lib/api/banking";
import { renderChartToPng } from "@/lib/assistant/chartImage";

interface Props {
  chart: ChartSpec;
  compact?: boolean;
}

/** График приходит в чат картинкой (PNG, canvas) + кнопка скачивания. */
export function AssistantChart({ chart, compact }: Props) {
  const [png, setPng] = useState<string | null>(null);

  useEffect(() => {
    setPng(renderChartToPng(chart));
  }, [chart]);

  if (!png) {
    return (
      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200 text-[10px] text-gray-500">
        Формирую график «{chart.title}»…
      </div>
    );
  }

  const fileName = `${chart.title.replace(/[^\wа-яёА-ЯЁ -]/gi, "").trim() || "chart"}.png`;

  return (
    <div className="mt-2 rounded-xl border border-slate-200 bg-white overflow-hidden">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={png}
        alt={chart.title}
        className={compact ? "w-full max-h-44 object-contain" : "w-full"}
      />
      <div className="flex items-center justify-between px-3 py-1.5 bg-slate-50 border-t border-slate-200">
        <span className="text-[10px] text-gray-500 truncate">{chart.title}</span>
        <a
          href={png}
          download={fileName}
          className="flex items-center gap-1 text-[10px] font-semibold text-[#138d8a] hover:underline shrink-0"
        >
          <Download className="w-3 h-3" />
          Скачать PNG
        </a>
      </div>
    </div>
  );
}
