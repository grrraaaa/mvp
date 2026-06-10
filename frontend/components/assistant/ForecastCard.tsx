"use client";

/**
 * ForecastCard — карточка прогноза остатков (как на макете):
 *  - заголовок «Прогноз остатков (N дней)»
 *  - SVG-график: плавная линия + точки, опорная линия тек. остатка
 *  - подписи оси X (день недели + дата)
 *  - блок статистики: ТЕК. ОСТАТОК | МИНИМУМ
 *  - цветной блок «РЕКОМЕНДАЦИЯ» (зелёный/жёлтый/красный)
 *  - чип провайдера, если LLM был недоступен и сработал fallback
 */

import { TrendingUp, TrendingDown, Sparkles, AlertTriangle } from "lucide-react";

export interface ForecastPoint {
  day: number;
  date: string; // YYYY-MM-DD
  weekday: string; // Пн/Вт/...
  balance: number;
  note?: string;
}

export interface ForecastPayload {
  type: "forecast";
  horizon_days: number;
  as_of: string;
  current_balance: number;
  minimum: number;
  minimum_day: number;
  gap_detected: boolean;
  recommendation: string;
  x_labels: string[]; // ["11.06\nСр", ...]
  values: number[]; // [47320, ...]
  notes?: string[];
  provider?: "openai" | "rule-based";
}

interface Props {
  payload: ForecastPayload;
  compact?: boolean;
}

const SBER = "#138d8a";
const SBER_DARK = "#0f7270";
const SBER_BG = "rgba(19,141,138,0.10)";

function fmt(n: number): string {
  return n.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  // Catmull-Rom → Bezier: даёт плавную кривую как на макете
  let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

function ForecastChart({ payload, compact }: { payload: ForecastPayload; compact?: boolean }) {
  const W = compact ? 280 : 320;
  const H = compact ? 100 : 120;
  const PAD_L = 6;
  const PAD_R = 6;
  const PAD_T = 14;
  const PAD_B = 4;

  const values = payload.values || [];
  if (values.length === 0) {
    return (
      <div className="text-[10px] text-gray-500 py-4 text-center">Нет данных для графика</div>
    );
  }

  const max = Math.max(...values, payload.current_balance, 1);
  const min = Math.min(...values, payload.current_balance, 0);
  const range = max - min || 1;
  const plotW = W - PAD_L - PAD_R;
  const plotH = H - PAD_T - PAD_B;

  const stepX = values.length > 1 ? plotW / (values.length - 1) : 0;
  const points = values.map((v, i) => ({
    x: PAD_L + i * stepX,
    y: PAD_T + plotH - ((v - min) / range) * plotH,
    v,
    i,
  }));

  const linePath = smoothPath(points);
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(PAD_T + plotH).toFixed(2)} L ${points[0].x.toFixed(2)} ${(PAD_T + plotH).toFixed(2)} Z`;

  // Опорная линия текущего остатка
  const currentY = PAD_T + plotH - ((payload.current_balance - min) / range) * plotH;

  // Минимум — точка
  const minIdx = points.findIndex((p) => p.v === payload.minimum);
  const minPoint = minIdx >= 0 ? points[minIdx] : null;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      className="block"
    >
      {/* Опорная горизонталь (тек. остаток) — пунктир */}
      <line
        x1={PAD_L}
        y1={currentY}
        x2={W - PAD_R}
        y2={currentY}
        stroke="#cbd5d4"
        strokeWidth={1}
        strokeDasharray="3 3"
      />

      {/* Заливка под кривой */}
      <path d={areaPath} fill={SBER_BG} />

      {/* Сама кривая */}
      <path d={linePath} fill="none" stroke={SBER} strokeWidth={2.2} strokeLinecap="round" />

      {/* Точки */}
      {points.map((p) => (
        <circle key={p.i} cx={p.x} cy={p.y} r={2.2} fill={SBER} />
      ))}

      {/* Подсветка минимума — белая точка в зелёном кольце */}
      {minPoint && (
        <>
          <circle cx={minPoint.x} cy={minPoint.y} r={5} fill="white" stroke={SBER} strokeWidth={2} />
        </>
      )}
    </svg>
  );
}

export function ForecastCard({ payload, compact }: Props) {
  const gap = payload.gap_detected;
  const forecastDelta =
    (payload.values?.[payload.values.length - 1] ?? payload.current_balance) -
    payload.current_balance;
  const deltaSign = forecastDelta >= 0 ? "+" : "−";
  const deltaAbs = Math.abs(forecastDelta);

  // Цвет рекомендации
  const recTone = gap
    ? "bg-rose-50 border-rose-200 text-rose-900"
    : payload.minimum < payload.current_balance * 0.2
      ? "bg-amber-50 border-amber-200 text-amber-900"
      : "bg-emerald-50 border-emerald-200 text-emerald-900";
  const RecIcon = gap ? AlertTriangle : TrendingUp;

  return (
    <div
      className={`mt-2 rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden ${
        compact ? "text-[11px]" : "text-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1.5">
        <h4 className={`font-bold text-gray-900 ${compact ? "text-[11px]" : "text-[13px]"}`}>
          Прогноз остатков ({payload.horizon_days} дн.)
        </h4>
        <div className="flex items-center gap-1.5">
          {payload.provider === "openai" ? (
            <span className="inline-flex items-center gap-0.5 rounded-full bg-[#e5fcf7] border border-[#107f8c]/30 text-[#107f8c] px-1.5 py-0.5 text-[9px] font-semibold">
              <Sparkles className="w-2.5 h-2.5" /> OpenAI
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-slate-100 text-slate-600 px-1.5 py-0.5 text-[9px] font-semibold">
              по правилам
            </span>
          )}
        </div>
      </div>

      {/* Chart */}
      <div className="px-1.5">
        <ForecastChart payload={payload} compact={compact} />
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between px-2 mt-0.5">
        {(payload.x_labels || []).map((label, i) => {
          const isMin = i + 1 === payload.minimum_day;
          return (
            <div
              key={i}
              className={`flex flex-col items-center text-[8.5px] leading-tight whitespace-pre text-center ${
                isMin ? "text-[#107f8c] font-bold" : "text-gray-500"
              }`}
              style={{ flex: 1 }}
            >
              {label}
            </div>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 px-3 pt-2.5 pb-2 border-t border-gray-100">
        <div>
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Тек. остаток</div>
          <div className={`font-extrabold text-[#107f8c] ${compact ? "text-[12px]" : "text-[15px]"} leading-tight`}>
            {fmt(payload.current_balance)}
          </div>
          <div className="text-[9px] text-gray-400">BYN</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">Минимум</div>
          <div
            className={`font-extrabold leading-tight ${
              gap ? "text-rose-600" : "text-[#107f8c]"
            } ${compact ? "text-[12px]" : "text-[15px]"}`}
          >
            {fmt(payload.minimum)}
          </div>
          <div className="text-[9px] text-gray-400">день {payload.minimum_day}</div>
        </div>
        <div>
          <div className="text-[9px] uppercase tracking-wider text-gray-500 font-semibold">
            Прогноз
          </div>
          <div
            className={`font-extrabold leading-tight flex items-center gap-0.5 ${
              forecastDelta >= 0 ? "text-emerald-600" : "text-rose-600"
            } ${compact ? "text-[12px]" : "text-[15px]"}`}
          >
            {forecastDelta >= 0 ? (
              <TrendingUp className="w-3 h-3" />
            ) : (
              <TrendingDown className="w-3 h-3" />
            )}
            {deltaSign}
            {fmt(deltaAbs)}
          </div>
          <div className="text-[9px] text-gray-400">BYN</div>
        </div>
      </div>

      {/* Recommendation box */}
      <div className={`mx-2 mb-2 rounded-xl border px-2.5 py-1.5 ${recTone}`}>
        <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-80">
          <RecIcon className="w-3 h-3" />
          {gap ? "Риск разрыва" : "Рекомендация"}
        </div>
        <div className={`mt-0.5 leading-snug ${compact ? "text-[10.5px]" : "text-xs"}`}>
          {payload.recommendation}
        </div>
      </div>
    </div>
  );
}
