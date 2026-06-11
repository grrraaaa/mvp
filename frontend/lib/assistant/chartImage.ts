/** Рендер ChartSpec в PNG (data URL) через offscreen-canvas — график приходит в чат картинкой. */

import type { ChartSpec } from "@/lib/api/banking";

const COLORS = ["#138d8a", "#2c9faf", "#5bb5c9", "#8ecae6", "#e9c46a", "#f4a261", "#e76f51"];
const W = 640;
const H = 400;
const PAD = { top: 56, right: 24, bottom: 56, left: 64 };

function fmt(v: number): string {
  return v.toLocaleString("ru-RU", { maximumFractionDigits: 0 });
}

function drawTitle(ctx: CanvasRenderingContext2D, chart: ChartSpec) {
  ctx.fillStyle = "#1f2937";
  ctx.font = "bold 17px Inter, Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(chart.title, PAD.left, 28);
  ctx.fillStyle = "#9ca3af";
  ctx.font = "11px Inter, Arial, sans-serif";
  ctx.fillText(`СберБизнес · ${chart.currency ?? "BYN"}`, PAD.left, 44);
}

function drawAxes(ctx: CanvasRenderingContext2D, max: number) {
  const plotH = H - PAD.top - PAD.bottom;
  ctx.strokeStyle = "#e5e7eb";
  ctx.fillStyle = "#9ca3af";
  ctx.font = "10px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  for (let i = 0; i <= 4; i++) {
    const y = PAD.top + plotH - (plotH * i) / 4;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(W - PAD.right, y);
    ctx.stroke();
    ctx.fillText(fmt((max * i) / 4), PAD.left - 8, y + 3);
  }
}

function drawBar(ctx: CanvasRenderingContext2D, chart: ChartSpec) {
  const data = chart.datasets[0]?.data ?? [];
  const max = Math.max(...data, 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  drawAxes(ctx, max);
  const step = plotW / data.length;
  const barW = Math.min(step * 0.62, 64);
  data.forEach((v, i) => {
    const x = PAD.left + step * i + (step - barW) / 2;
    const bh = (v / max) * plotH;
    const y = PAD.top + plotH - bh;
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.roundRect(x, y, barW, bh, [4, 4, 0, 0]);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.font = "bold 10px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fmt(v), x + barW / 2, y - 5);
    ctx.fillStyle = "#6b7280";
    ctx.font = "10px Inter, Arial, sans-serif";
    const label = (chart.labels[i] ?? "").slice(0, 14);
    ctx.fillText(label, x + barW / 2, PAD.top + plotH + 16);
  });
}

function drawLine(ctx: CanvasRenderingContext2D, chart: ChartSpec) {
  const data = chart.datasets[0]?.data ?? [];
  const max = Math.max(...data, 1);
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  drawAxes(ctx, max);
  const pts = data.map((v, i) => ({
    x: PAD.left + (plotW * i) / Math.max(data.length - 1, 1),
    y: PAD.top + plotH - (v / max) * plotH,
  }));

  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.lineTo(pts[pts.length - 1]?.x ?? PAD.left, PAD.top + plotH);
  ctx.lineTo(PAD.left, PAD.top + plotH);
  ctx.closePath();
  ctx.fillStyle = "rgba(19,141,138,0.12)";
  ctx.fill();

  ctx.beginPath();
  pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
  ctx.strokeStyle = "#138d8a";
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.fillStyle = "#138d8a";
  pts.forEach((p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.fillStyle = "#6b7280";
  ctx.font = "10px Inter, Arial, sans-serif";
  ctx.textAlign = "center";
  const every = Math.ceil(chart.labels.length / 8);
  chart.labels.forEach((label, i) => {
    if (i % every !== 0) return;
    ctx.fillText(label.slice(0, 12), pts[i]?.x ?? 0, PAD.top + plotH + 16);
  });
}

function drawPie(ctx: CanvasRenderingContext2D, chart: ChartSpec, donut: boolean) {
  const data = chart.datasets[0]?.data ?? [];
  const total = data.reduce((s, v) => s + v, 0) || 1;
  const cx = W * 0.32;
  const cy = PAD.top + (H - PAD.top - PAD.bottom) / 2 + 6;
  const r = Math.min(W, H) * 0.26;
  let angle = -Math.PI / 2;
  data.forEach((v, i) => {
    const slice = (v / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, angle, angle + slice);
    ctx.closePath();
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.fill();
    angle += slice;
  });
  if (donut) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.55, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.fillStyle = "#1f2937";
    ctx.font = "bold 13px Inter, Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(fmt(total), cx, cy + 4);
  }
  // Легенда справа
  ctx.textAlign = "left";
  const lx = W * 0.58;
  let ly = PAD.top + 12;
  data.forEach((v, i) => {
    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.beginPath();
    ctx.roundRect(lx, ly - 8, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#374151";
    ctx.font = "11px Inter, Arial, sans-serif";
    const pct = ((v / total) * 100).toFixed(1);
    ctx.fillText(`${(chart.labels[i] ?? "").slice(0, 22)} — ${fmt(v)} (${pct}%)`, lx + 16, ly);
    ly += 20;
  });
}

export function renderChartToPng(chart: ChartSpec): string | null {
  if (typeof document === "undefined") return null;
  const canvas = document.createElement("canvas");
  const scale = 2; // retina
  canvas.width = W * scale;
  canvas.height = H * scale;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(scale, scale);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, W, H);
  drawTitle(ctx, chart);

  if (chart.type === "line") drawLine(ctx, chart);
  else if (chart.type === "pie" || chart.type === "donut")
    drawPie(ctx, chart, chart.type === "donut");
  else drawBar(ctx, chart);

  ctx.fillStyle = "#d1d5db";
  ctx.font = "10px Inter, Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText("Сформировано ассистентом СберБизнес", W - PAD.right, H - 12);

  return canvas.toDataURL("image/png");
}
