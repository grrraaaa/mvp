"use client";

import { createContext, useContext } from "react";

interface SbbolUiContextValue {
  openDocumentModal: () => void;
  openChat: () => void;
  openServiceApplication: (serviceName?: string) => void;
}

export const SbbolUiContext = createContext<SbbolUiContextValue>({
  openDocumentModal: () => {},
  openChat: () => {},
  openServiceApplication: () => {},
});

export function useSbbolUi() {
  return useContext(SbbolUiContext);
}
