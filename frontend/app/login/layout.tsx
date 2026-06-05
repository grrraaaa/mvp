import type { ReactNode } from "react";

/** Страница входа — стили wspace (Inter, #f4f6f9), без тёмной темы ассистента. */
export default function LoginLayout({ children }: { children: ReactNode }) {
  return <div className="wspace-app min-h-screen w-full overflow-x-hidden">{children}</div>;
}
