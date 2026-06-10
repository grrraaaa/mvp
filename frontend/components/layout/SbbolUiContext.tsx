"use client";

import { createContext, useContext } from "react";

interface SbbolUiContextValue {
  openDocumentModal: () => void;
  openChat: () => void;
  closeChat: () => void;
  toggleChat: () => void;
  chatOpen: boolean;
  openServiceApplication: (serviceName?: string) => void;
}

export const SbbolUiContext = createContext<SbbolUiContextValue>({
  openDocumentModal: () => {},
  openChat: () => {},
  closeChat: () => {},
  toggleChat: () => {},
  chatOpen: false,
  openServiceApplication: () => {},
});

export function useSbbolUi() {
  return useContext(SbbolUiContext);
}
