/** Простые уведомления о результате действия (вместо alert). */

export function bankingToast(message: string, type: "ok" | "err" | "info" = "info") {
  if (typeof window === "undefined") return;
  const el = document.createElement("div");
  el.className = `fixed bottom-6 right-6 z-[200] max-w-sm px-4 py-3 rounded-xl shadow-lg text-xs font-semibold text-white animate-fade-in ${
    type === "ok" ? "bg-emerald-600" : type === "err" ? "bg-red-600" : "bg-slate-700"
  }`;
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 4000);
}
