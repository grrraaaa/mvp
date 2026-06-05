"use client";

import { createContext, useContext } from "react";

interface SbbolUiContextValue {
  openDocumentModal: () => void;
  openChat: () => void;
}

export const SbbolUiContext = createContext<SbbolUiContextValue>({
  openDocumentModal: () => {},
  openChat: () => {},
});

export function useSbbolUi() {
  return useContext(SbbolUiContext);
}
