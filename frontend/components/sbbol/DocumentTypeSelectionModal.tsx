"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect } from "react";
import { showStubToast } from "@/lib/sbbol/stubToast";
import { routeForDocumentType } from "@/lib/sbbol/paymentDocumentRoutes";

interface Props {
  html: string;
  onClose: () => void;
}

export function DocumentTypeSelectionModal({ html, onClose }: Props) {
  const router = useRouter();

  const handleContentClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      event.stopPropagation();

      const target = event.target as HTMLElement;
      if (target.closest('[name="modal.close"]') || target.closest('[data-testid="close-btn"]')) {
        onClose();
        return;
      }

      const docButton = target.closest('button[name^="modal.docIcon."]') as HTMLButtonElement | null;
      if (!docButton) return;

      const href = routeForDocumentType(docButton.getAttribute("name"));
      if (!href) {
        showStubToast("Этот тип документа доступен в полной версии банка (демо)");
        return;
      }

      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div
      className="sbbol-doc-types-modal sbbol-app fixed inset-0 z-[10000] flex items-center justify-center p-6"
      role="presentation"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <link rel="stylesheet" href="/sber-orig/static/fonts/fonts.css" />
      <link rel="stylesheet" href="/sber-orig/static/main.bundle.css" />
      <link rel="stylesheet" href="/sber-orig/static/745.bundle.css" />

      <div className="sbbol-doc-types-modal__backdrop absolute inset-0" aria-hidden />

      <div
        className="sbbol-doc-types-modal__panel relative z-[1] w-full max-h-[calc(100vh-48px)] overflow-auto"
        role="dialog"
        aria-modal="true"
        aria-label="Новый документ"
        onClick={handleContentClick}
      >
        <div className="sbbol-doc-types-modal__content" dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
}
