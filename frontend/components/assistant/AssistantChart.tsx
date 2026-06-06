"use client";

import type { ChartSpec } from "@/lib/api/banking";

const COLORS = ["#138d8a", "#2c9faf", "#5bb5c9", "#8ecae6", "#e9c46a", "#f4a261", "#e76f51"];

interface Props {
  chart: ChartSpec;
  compact?: boolean;
}

export function AssistantChart({ chart, compact }: Props) {
  const data = chart.datasets[0]?.data ?? [];
  const max = Math.max(...data, 1);
  const h = compact ? 100 : 140;

  if (chart.type === "line") {
    const points = data
      .map((v, i) => {
        const x = (i / Math.max(data.length - 1, 1)) * 280;
        const y = h - (v / max) * (h - 20);
        return `${x},${y}`;
      })
      .join(" ");
    return (
      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-[10px] font-bold text-gray-600 mb-2">{chart.title}</div>
        <svg viewBox={`0 0 300 ${h}`} className="w-full" role="img" aria-label={chart.title}>
          <polyline fill="none" stroke="#138d8a" strokeWidth="2.5" points={points} />
        </svg>
      </div>
    );
  }

  if (chart.type === "pie" || chart.type === "donut") {
    let acc = 0;
    const slices = data.map((v, i) => {
      const start = acc;
      acc += v / data.reduce((s, x) => s + x, 0);
      return { start, end: acc, color: COLORS[i % COLORS.length], label: chart.labels[i], value: v };
    });
    return (
      <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
        <div className="text-[10px] font-bold text-gray-600 mb-2">{chart.title}</div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {slices.map((s) => (
            <span key={s.label} className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}: {s.value.toLocaleString()} {chart.currency ?? "BYN"}
            </span>
          ))}
        </div>
        <div className="flex h-3 rounded-full overflow-hidden mt-2">
          {slices.map((s) => (
            <div
              key={s.label}
              style={{ width: `${((s.end - s.start) * 100).toFixed(1)}%`, background: s.color }}
              title={`${s.label}: ${s.value}`}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
      <div className="text-[10px] font-bold text-gray-600 mb-2">{chart.title}</div>
      <div className="flex items-end gap-1.5" style={{ height: h }}>
        {data.map((v, i) => (
          <div key={chart.labels[i]} className="flex-1 flex flex-col items-center gap-0.5 min-w-0">
            <div
              className="w-full bg-[#138d8a] rounded-t"
              style={{ height: `${(v / max) * (h - 24)}px` }}
              title={`${v} ${chart.currency ?? ""}`}
            />
            <span className="text-[8px] text-gray-500 truncate w-full text-center">{chart.labels[i]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
