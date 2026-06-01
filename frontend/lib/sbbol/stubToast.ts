const TOAST_DURATION_MS = 2800;

let hideTimer: ReturnType<typeof setTimeout> | null = null;

/** Brief non-blocking feedback for stub actions in captured SBBOL HTML. */
export function showStubToast(message: string): void {
  if (typeof document === "undefined") return;

  let toast = document.getElementById("sbbol-demo-toast") as HTMLDivElement | null;
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "sbbol-demo-toast";
    toast.setAttribute("role", "status");
    toast.className = "sbbol-demo-toast";
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("sbbol-demo-toast--visible");

  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    toast?.classList.remove("sbbol-demo-toast--visible");
  }, TOAST_DURATION_MS);
}
