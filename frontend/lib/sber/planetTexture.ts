import * as THREE from "three";

const cache = new Map<string, THREE.CanvasTexture>();

export type PlanetThemeId =
  | "sun"
  | "cards"
  | "deposits"
  | "credits"
  | "investments"
  | "insurance"
  | "payments";

/** Тематическая текстура планеты + подпись. */
export function createThematicPlanetTexture(
  theme: PlanetThemeId,
  label: string,
  baseColor: string,
  size = 512
): THREE.CanvasTexture {
  const key = `${theme}|${label}|${baseColor}|${size}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    const fallback = new THREE.CanvasTexture(canvas);
    cache.set(key, fallback);
    return fallback;
  }

  paintPlanetBase(ctx, size, baseColor);
  switch (theme) {
    case "sun":
      paintSun(ctx, size);
      break;
    case "cards":
      paintCards(ctx, size);
      break;
    case "deposits":
      paintDeposits(ctx, size);
      break;
    case "credits":
      paintCredits(ctx, size);
      break;
    case "investments":
      paintInvestments(ctx, size);
      break;
    case "insurance":
      paintInsurance(ctx, size);
      break;
    case "payments":
      paintPayments(ctx, size);
      break;
  }
  paintLabel(ctx, size, label);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

/** @deprecated используйте createThematicPlanetTexture */
export function createPlanetLabelTexture(
  label: string,
  baseColor: string,
  size = 512
) {
  return createThematicPlanetTexture("payments", label, baseColor, size);
}

function paintPlanetBase(
  ctx: CanvasRenderingContext2D,
  size: number,
  baseColor: string
) {
  const grad = ctx.createRadialGradient(
    size * 0.32,
    size * 0.28,
    size * 0.04,
    size * 0.5,
    size * 0.5,
    size * 0.58
  );
  grad.addColorStop(0, lighten(baseColor, 0.5));
  grad.addColorStop(0.5, baseColor);
  grad.addColorStop(1, darken(baseColor, 0.4));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  ctx.globalAlpha = 0.12;
  for (let i = 0; i < 6; i++) {
    ctx.beginPath();
    ctx.ellipse(
      size * (0.15 + i * 0.12),
      size * (0.2 + (i % 2) * 0.25),
      35 + i * 14,
      18 + i * 5,
      i * 0.5,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "#fff";
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function paintLabel(ctx: CanvasRenderingContext2D, size: number, label: string) {
  ctx.save();
  ctx.translate(size / 2, size * 0.82);
  const fontSize = label.length > 9 ? 44 : label.length > 6 ? 52 : 58;
  ctx.font = `bold ${fontSize}px system-ui, Segoe UI, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(0,0,0,0.65)";
  ctx.fillText(label, 2, 3);
  ctx.fillStyle = "#ffffff";
  ctx.fillText(label, 0, 0);
  ctx.restore();
}

function paintSun(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size * 0.5;
  const cy = size * 0.42;
  ctx.save();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * size * 0.38, cy + Math.sin(a) * size * 0.38);
    ctx.strokeStyle = "rgba(33, 160, 56, 0.35)";
    ctx.lineWidth = size * 0.018;
    ctx.stroke();
  }
  ctx.fillStyle = "#21A038";
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.22, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `bold ${size * 0.11}px system-ui`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("С", cx, cy + size * 0.01);
  ctx.restore();
}

function paintCards(ctx: CanvasRenderingContext2D, size: number) {
  const w = size * 0.42;
  const h = size * 0.28;
  const x = size * 0.5 - w / 2;
  const y = size * 0.32;
  ctx.save();
  ctx.translate(size * 0.08, size * 0.06);
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  roundRect(ctx, x + 8, y + 10, w, h, 14);
  ctx.fill();
  ctx.restore();

  const grad = ctx.createLinearGradient(x, y, x + w, y + h);
  grad.addColorStop(0, "#1e88e5");
  grad.addColorStop(1, "#0d47a1");
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, 14);
  ctx.fill();

  ctx.fillStyle = "#ffc107";
  roundRect(ctx, x + size * 0.04, y + size * 0.05, size * 0.09, size * 0.07, 4);
  ctx.fill();

  ctx.strokeStyle = "rgba(255,255,255,0.5)";
  ctx.lineWidth = 3;
  for (let i = 0; i < 3; i++) {
    ctx.beginPath();
    ctx.moveTo(x + size * 0.05, y + h * 0.45 + i * 10);
    ctx.lineTo(x + w * 0.7, y + h * 0.45 + i * 10);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = `bold ${size * 0.055}px monospace`;
  ctx.fillText("•••• 4286", x + size * 0.04, y + h * 0.78);
}

function paintDeposits(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size * 0.5;
  const baseY = size * 0.58;

  ctx.fillStyle = "#ffb300";
  ctx.beginPath();
  ctx.ellipse(cx, baseY, size * 0.2, size * 0.06, 0, 0, Math.PI * 2);
  ctx.fill();

  for (let i = 0; i < 4; i++) {
    const ox = (i - 1.5) * size * 0.09;
    ctx.fillStyle = i % 2 === 0 ? "#ffd54f" : "#ffca28";
    ctx.beginPath();
    ctx.ellipse(cx + ox, baseY - size * 0.02, size * 0.07, size * 0.025, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    ctx.font = `${size * 0.04}px sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText("BYN", cx + ox, baseY - size * 0.01);
  }

  ctx.strokeStyle = "#8d6e63";
  ctx.lineWidth = size * 0.025;
  ctx.beginPath();
  ctx.arc(cx, baseY - size * 0.12, size * 0.14, Math.PI, 0);
  ctx.stroke();

  ctx.fillStyle = "#4caf50";
  ctx.fillRect(cx - size * 0.02, baseY - size * 0.28, size * 0.04, size * 0.16);
  ctx.beginPath();
  ctx.moveTo(cx, baseY - size * 0.34);
  ctx.lineTo(cx - size * 0.1, baseY - size * 0.22);
  ctx.lineTo(cx + size * 0.1, baseY - size * 0.22);
  ctx.closePath();
  ctx.fill();
}

function paintCredits(ctx: CanvasRenderingContext2D, size: number) {
  const x = size * 0.22;
  const y = size * 0.38;
  const w = size * 0.56;
  const h = size * 0.22;

  ctx.fillStyle = "#ff7043";
  roundRect(ctx, x, y + h * 0.35, w, h * 0.55, 8);
  ctx.fill();
  ctx.fillStyle = "#424242";
  for (let i = 0; i < 2; i++) {
    ctx.beginPath();
    ctx.arc(x + w * 0.22 + i * w * 0.35, y + h * 0.75, size * 0.055, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = "#bdbdbd";
  roundRect(ctx, x + w * 0.08, y + h * 0.2, w * 0.35, h * 0.35, 6);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.95)";
  ctx.font = `bold ${size * 0.12}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("%", size * 0.78, size * 0.38);

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(size * 0.68, size * 0.52);
  ctx.quadraticCurveTo(size * 0.75, size * 0.35, size * 0.82, size * 0.48);
  ctx.stroke();
}

function paintInvestments(ctx: CanvasRenderingContext2D, size: number) {
  const ox = size * 0.2;
  const oy = size * 0.55;
  const bw = size * 0.12;
  const heights = [0.25, 0.4, 0.55, 0.35, 0.65];
  heights.forEach((h, i) => {
    const grad = ctx.createLinearGradient(0, oy, 0, oy - size * h);
    grad.addColorStop(0, "#7e57c2");
    grad.addColorStop(1, "#b39ddb");
    ctx.fillStyle = grad;
    ctx.fillRect(ox + i * (bw + 8), oy - size * h, bw, size * h);
  });

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(ox, oy - size * 0.2);
  ctx.lineTo(ox + size * 0.35, oy - size * 0.45);
  ctx.lineTo(ox + size * 0.62, oy - size * 0.55);
  ctx.stroke();

  ctx.fillStyle = "#ffd700";
  ctx.beginPath();
  ctx.arc(size * 0.72, size * 0.36, size * 0.09, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(0,0,0,0.25)";
  ctx.font = `bold ${size * 0.07}px sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("₽", size * 0.72, size * 0.37);
}

function paintInsurance(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size * 0.5;
  const cy = size * 0.4;
  ctx.fillStyle = "rgba(0, 105, 92, 0.85)";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.22);
  ctx.lineTo(cx + size * 0.2, cy - size * 0.08);
  ctx.lineTo(cx + size * 0.2, cy + size * 0.12);
  ctx.quadraticCurveTo(cx, cy + size * 0.28, cx - size * 0.2, cy + size * 0.12);
  ctx.lineTo(cx - size * 0.2, cy - size * 0.08);
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = "#fff";
  ctx.lineWidth = size * 0.025;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.08, cy + size * 0.02);
  ctx.lineTo(cx - size * 0.01, cy + size * 0.1);
  ctx.lineTo(cx + size * 0.1, cy - size * 0.06);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.22, size * 0.12, 0, Math.PI);
  ctx.fill();
}

function paintPayments(ctx: CanvasRenderingContext2D, size: number) {
  const cx = size * 0.5;
  const cy = size * 0.42;

  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(cx - size * 0.18, cy, size * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx + size * 0.18, cy, size * 0.1, 0, Math.PI * 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(cx - size * 0.08, cy);
  ctx.lineTo(cx + size * 0.08, cy);
  ctx.stroke();

  ctx.fillStyle = "#66bb6a";
  roundRect(ctx, cx - size * 0.14, cy + size * 0.12, size * 0.28, size * 0.38, 10);
  ctx.fill();
  ctx.fillStyle = "#fff";
  ctx.font = `${size * 0.08}px system-ui`;
  ctx.textAlign = "center";
  ctx.fillText("ERIP", cx, cy + size * 0.34);

  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(cx - size * 0.06 + i * size * 0.06, cy + size * 0.2, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function lighten(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return rgb(
    Math.min(255, r + 255 * amount),
    Math.min(255, g + 255 * amount),
    Math.min(255, b + 255 * amount)
  );
}

function darken(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex);
  return rgb(r * (1 - amount), g * (1 - amount), b * (1 - amount));
}

function parseHex(hex: string) {
  const h = hex.replace("#", "");
  const n = parseInt(
    h.length === 3 ? h.split("").map((c) => c + c).join("") : h,
    16
  );
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgb(r: number, g: number, b: number) {
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
