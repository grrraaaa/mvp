/** Shared sizing for @react-three/drei Html tooltips in the 3D solar system. */

/** Fixed screen pixels — omit distanceFactor so tooltips stay readable at any orbit depth. */
export const TOOLTIP_HTML_STYLE = { pointerEvents: "none" as const };

export const TOOLTIP_WRAPPER_CLASS = "pointer-events-none select-none !text-base";

export const TOOLTIP_HTML_PROPS = {
  center: true as const,
  style: TOOLTIP_HTML_STYLE,
  wrapperClass: TOOLTIP_WRAPPER_CLASS,
};

export const TOOLTIP_PANEL =
  "px-4 py-3 rounded-xl bg-black/90 border border-sber-green/50 text-white text-base text-center shadow-lg min-w-[320px] max-w-[400px]";

export const TOOLTIP_TITLE = "font-bold text-lg leading-tight text-sber-green-light";

export const TOOLTIP_BODY = "text-sber-muted mt-1.5 text-base leading-snug";

export const TOOLTIP_PLANET_PANEL =
  "px-4 py-3 rounded-lg bg-black/90 border border-sber-green/40 text-white text-base min-w-[320px] max-w-[400px] shadow-lg";

export const TOOLTIP_PLANET_FOOTER = "text-sm text-sber-muted/70 mt-1.5 truncate";

export const TOOLTIP_ORBIT_HINT =
  "px-4 py-3 text-base text-sber-muted/90 pointer-events-none min-w-[320px] text-center";

export const TOOLTIP_SATELLITE_PANEL =
  "px-4 py-3 rounded-lg bg-black/90 text-base text-white border border-white/15 min-w-[320px] max-w-[400px] shadow-lg";
