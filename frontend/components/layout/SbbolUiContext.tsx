"use client";

import { createContext, useContext } from "react";

interface SbbolUiContextValue {
  openMap: () => void;
  openDocumentModal: () => void;
  openChat: () => void;
}

export const SbbolUiContext = createContext<SbbolUiContextValue>({
  openMap: () => {},
  openDocumentModal: () => {},
  openChat: () => {},
});

export function useSbbolUi() {
  return useContext(SbbolUiContext);
}
