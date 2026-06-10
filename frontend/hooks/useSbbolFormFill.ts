"use client";

import type { RefObject } from "react";

/** @deprecated Заполнение форм — через FormFillBridge (глобально с повторами). */
export function useSbbolFormFill(_rootRef: RefObject<HTMLElement | null>) {
  /* no-op: FormFillBridge в AppProviders */
}
