"use client";

import { useEffect, type RefObject } from "react";
import { fetchAccounts } from "@/lib/api/banking";
import type { BankAccount } from "@/lib/banking/types";
import {
  ACCOUNT_FIELD_SELECTOR,
  applyAccountToContainer,
  filterAccountsForField,
  findAccountByIban,
  getSelectedIban,
  renderAccountPlaceholder,
} from "@/lib/sbbol/accountPickerDom";
import { useBankingStore } from "@/store/bankingStore";

const DROPDOWN_CLASS = "sbbol-account-picker-dropdown";

type ActiveDropdown = {
  menu: HTMLElement;
  container: HTMLElement;
  reposition: () => void;
};

let activeDropdown: ActiveDropdown | null = null;

function positionAccountDropdown(menu: HTMLElement, container: HTMLElement): void {
  const rect = container.getBoundingClientRect();
  const gap = 4;
  const maxHeight = 280;
  const spaceBelow = window.innerHeight - rect.bottom - gap;
  const spaceAbove = rect.top - gap;
  const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;
  const height = Math.min(maxHeight, openAbove ? spaceAbove : spaceBelow);

  menu.style.width = `${Math.max(rect.width, 280)}px`;
  menu.style.maxHeight = `${Math.max(height, 120)}px`;
  menu.style.left = `${Math.max(8, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 280) - 8))}px`;

  menu.style.bottom = "";
  if (openAbove) {
    menu.style.top = "auto";
    menu.style.bottom = `${window.innerHeight - rect.top + gap}px`;
  } else {
    menu.style.top = `${rect.bottom + gap}px`;
  }
}

function removeDropdown(): void {
  if (activeDropdown) {
    window.removeEventListener("scroll", activeDropdown.reposition, true);
    window.removeEventListener("resize", activeDropdown.reposition);
    activeDropdown.container.setAttribute("aria-expanded", "false");
    activeDropdown.menu.remove();
    activeDropdown = null;
  }
  document.querySelectorAll(`.${DROPDOWN_CLASS}`).forEach((el) => el.remove());
}

function pickDefaultAccount(accounts: BankAccount[], dataName: string): BankAccount | undefined {
  const filtered = filterAccountsForField(accounts, dataName);
  return filtered[0];
}

function openDropdown(
  container: HTMLElement,
  accounts: BankAccount[],
  onPick: (acc: BankAccount) => void,
): void {
  removeDropdown();
  const dataName = container.getAttribute("data-name") ?? "";
  const list = filterAccountsForField(accounts, dataName);
  if (!list.length) return;

  const menu = document.createElement("div");
  menu.className = DROPDOWN_CLASS;
  menu.setAttribute("role", "listbox");

  for (const acc of list) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "sbbol-account-picker-item";
    item.setAttribute("role", "option");
    Object.assign(item.style, {
      display: "block",
      width: "100%",
      textAlign: "left",
      border: "none",
      background: "transparent",
      padding: "10px 14px",
      cursor: "pointer",
    });
    item.innerHTML = `<div style="font-weight:600;font-size:14px;color:#1f1f22;">${acc.id}</div>
      <div style="font-size:12px;color:#7d838a;margin-top:2px;">${acc.currency} • ${acc.type}</div>
      ${acc.label ? `<div style="font-size:12px;color:#107f8c;margin-top:2px;">${acc.label}</div>` : ""}`;
    item.addEventListener("mouseenter", () => {
      item.style.background = "#f2f4f7";
    });
    item.addEventListener("mouseleave", () => {
      item.style.background = "transparent";
    });
    item.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      onPick(acc);
      removeDropdown();
    });
    menu.appendChild(item);
  }

  document.body.appendChild(menu);
  container.setAttribute("aria-expanded", "true");

  const reposition = () => positionAccountDropdown(menu, container);
  reposition();
  window.addEventListener("scroll", reposition, true);
  window.addEventListener("resize", reposition);
  activeDropdown = { menu, container, reposition };

  const onOutside = (event: MouseEvent) => {
    const target = event.target as Node;
    if (!menu.contains(target) && !container.contains(target)) {
      removeDropdown();
      container.setAttribute("aria-expanded", "false");
      document.removeEventListener("mousedown", onOutside, true);
    }
  };
  setTimeout(() => document.addEventListener("mousedown", onOutside, true), 0);
}

async function ensureAccounts(): Promise<BankAccount[]> {
  const store = useBankingStore.getState();
  if (store.accounts.length) return store.accounts;
  try {
    const accounts = await fetchAccounts();
    useBankingStore.setState({ accounts, loaded: true });
    return accounts;
  } catch {
    if (!store.loaded) void store.loadAll();
    return useBankingStore.getState().accounts;
  }
}

function hydratePlaceholders(root: HTMLElement, accounts: BankAccount[]): void {
  root.querySelectorAll(ACCOUNT_FIELD_SELECTOR).forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    if (getSelectedIban(node)) return;
    const placeholder = node.querySelector(".Select-placeholder-ZGy5");
    if (!placeholder) return;
    const dataName = node.getAttribute("data-name") ?? "";
    const defaultAcc = pickDefaultAccount(accounts, dataName);
    if (defaultAcc) applyAccountToContainer(node, defaultAcc);
  });
}

export function useSbbolAccountPicker(rootRef: RefObject<HTMLElement | null>, deps: unknown[] = []) {
  const accounts = useBankingStore((s) => s.accounts);
  const loaded = useBankingStore((s) => s.loaded);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let cancelled = false;

    const boot = async () => {
      const list = accounts.length ? accounts : await ensureAccounts();
      if (cancelled || !list.length) return;
      hydratePlaceholders(root, list);
    };

    void boot();

    const onClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const container = target.closest(ACCOUNT_FIELD_SELECTOR) as HTMLElement | null;
      if (!container || !root.contains(container)) return;

      event.preventDefault();
      event.stopPropagation();

      void (async () => {
        const list = accounts.length ? accounts : await ensureAccounts();
        if (!list.length) return;
        openDropdown(container, list, (acc) => applyAccountToContainer(container, acc));
      })();
    };

    root.addEventListener("click", onClick, true);

    return () => {
      cancelled = true;
      root.removeEventListener("click", onClick, true);
      removeDropdown();
    };
  }, [rootRef, accounts, loaded, ...deps]);
}

/** Для AI form-fill: подставить счёт по IBAN или названию. */
export function fillCustomerAccountField(root: HTMLElement, value: string, accounts: BankAccount[]): boolean {
  const containers = Array.from(root.querySelectorAll(ACCOUNT_FIELD_SELECTOR)).filter(
    (n): n is HTMLElement => n instanceof HTMLElement,
  );
  if (!containers.length) return false;

  const container = containers[0];
  const dataName = container.getAttribute("data-name") ?? "";
  const acc =
    findAccountByIban(accounts, value) ??
    accounts.find((a) => a.label.toLowerCase().includes(value.toLowerCase())) ??
    pickDefaultAccount(accounts, dataName);

  if (!acc) return false;
  applyAccountToContainer(container, acc);
  return true;
}
