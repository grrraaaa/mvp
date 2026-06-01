"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { showDemoToast } from "@/lib/sbbol/demoToast";
import { useSbbolUi } from "@/components/layout/SbbolUiContext";
import {
  DOCUMENT_DEMO_MESSAGES,
  type OrigPageInteractionConfig,
} from "@/lib/sbbol/origPageRoutes";

const DEMO_STUB_MESSAGE = "Доступно в полной версии интернет-банка (демо)";
const DICTIONARY_STUB_MESSAGE =
  "Справочник недоступен в демо. Используйте «Чат с банком» для заполнения полей голосом или текстом.";

function activateTab(tabLi: HTMLElement): void {
  const container = tabLi.closest('[data-name="Tabs-container"]');
  if (!container) return;

  container.querySelectorAll("li[data-index]").forEach((li) => {
    li.classList.remove("Tabs-activeMenu-thal");
  });
  tabLi.classList.add("Tabs-activeMenu-thal");

  const index = tabLi.getAttribute("data-index");
  if (index !== null) {
    container.setAttribute("data-activetab", index);
  }
}

export function useSbbolOrigPageInteractions(
  rootRef: React.RefObject<HTMLElement | null>,
  config: OrigPageInteractionConfig | undefined,
  deps: unknown[] = [],
): void {
  const router = useRouter();
  const { openChat } = useSbbolUi();

  useEffect(() => {
    const root = rootRef.current;
    if (!root || !config) return;

    const backRoute = config.backRoute ?? "/";

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      if (target.closest(".ChatButton-chatButton-QWFO")) {
        event.preventDefault();
        event.stopPropagation();
        openChat();
        return;
      }

      const createBtn = target.closest('[name="payments.createDoc"], [name="header.createDoc"]');
      if (createBtn) {
        event.preventDefault();
        event.stopPropagation();
        config.onCreateDoc?.();
        return;
      }

      if (target.closest('[name="header.back"]')) {
        event.preventDefault();
        event.stopPropagation();
        router.push(backRoute);
        return;
      }

      if (target.closest('[name="document.close"]')) {
        event.preventDefault();
        event.stopPropagation();
        router.push(backRoute);
        return;
      }

      const sectionLink = target.closest("button.SectionPage-navLink-H6xL") as HTMLButtonElement | null;
      if (sectionLink) {
        const name = sectionLink.getAttribute("name") ?? "";
        const href = config.sectionRoutes?.[name];
        event.preventDefault();
        event.stopPropagation();
        if (href) {
          router.push(href);
        } else {
          showDemoToast(DEMO_STUB_MESSAGE);
        }
        return;
      }

      const docAction = target.closest("button[name^='document.']") as HTMLButtonElement | null;
      if (docAction) {
        const name = docAction.getAttribute("name") ?? "";
        event.preventDefault();
        event.stopPropagation();
        showDemoToast(DOCUMENT_DEMO_MESSAGES[name] ?? DEMO_STUB_MESSAGE);
        return;
      }

      if (
        target.closest('[name$=".dictionaryInputIcon"]') ||
        target.closest('[name="AddButton"]') ||
        target.closest('[data-name="filters.currFilter"]') ||
        target.closest('[data-name="filters.periodFilter"]')
      ) {
        event.preventDefault();
        event.stopPropagation();
        showDemoToast(DICTIONARY_STUB_MESSAGE);
        return;
      }

      const tabLi = target.closest('[data-name="Tabs-container"] li[data-index]') as HTMLElement | null;
      if (tabLi) {
        event.preventDefault();
        event.stopPropagation();
        activateTab(tabLi);
        return;
      }
    };

    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [rootRef, config, router, openChat, ...deps]);
}
