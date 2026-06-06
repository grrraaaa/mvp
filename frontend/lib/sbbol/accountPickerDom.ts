import type { BankAccount } from "@/lib/banking/types";

const CHEVRON_SVG = `<svg class="createIcon-Icon-AAkJ Select-chevron-exzx" name="Icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 1024 1024"><path fill="currentColor" transform="rotate(180, 512,512)" d="M509.467 220.51l487.681 436.346c34.223 34.223 34.223 85.558 8.556 119.781-34.223 34.223-85.558 34.223-119.781 8.556l-376.455-342.232-367.9 333.676c-34.223 34.223-85.558 25.667-119.781-8.556s-25.667-85.558 8.556-119.781l479.125-427.79z"></path></svg>`;

export const ACCOUNT_FIELD_SELECTOR = '[data-name$="COMMON_COLUMNS_CUSTOMER_ACCOUNT"]';

export function currencyFilterForField(dataName: string): string | null {
  if (dataName.includes("PAYDOCCUR")) return "foreign";
  return "BYN";
}

export function filterAccountsForField(accounts: BankAccount[], dataName: string): BankAccount[] {
  const visible = accounts.filter((a) => !a.hidden);
  const filter = currencyFilterForField(dataName);
  if (filter === "BYN") {
    return visible.filter((a) => a.currency === "BYN");
  }
  return visible.filter((a) => a.currency !== "BYN");
}

export function accountItemHtml(acc: BankAccount): string {
  const nickname = acc.label?.trim();
  const nicknameBlock = nickname
    ? `<div class="AccountItem-description-oEoC"><div class="PopupTooltip-trigger-q552"><div class="StringController-text-O5zZ">${escapeHtml(nickname)}</div></div></div>`
    : "";
  return `<div class="AccountItem-container-WSig" data-iban="${escapeAttr(acc.id)}">
    <div class="AccountItem-title-WlWr">${escapeHtml(acc.id)}</div>
    <div class="AccountItem-description-oEoC">${escapeHtml(acc.currency)} • ${escapeHtml(acc.type)}</div>
    ${nicknameBlock}
  </div>`;
}

export function renderSelectedAccount(selectEl: HTMLElement, acc: BankAccount): void {
  selectEl.innerHTML = `${CHEVRON_SVG}${accountItemHtml(acc)}`;
}

export function renderAccountPlaceholder(selectEl: HTMLElement): void {
  selectEl.innerHTML = `${CHEVRON_SVG}<div class="Select-placeholder-ZGy5 placeHolder">Выберите счет</div>`;
}

export function getSelectedIban(container: HTMLElement): string | null {
  return container.getAttribute("data-selected-iban");
}

export function applyAccountToContainer(container: HTMLElement, acc: BankAccount): void {
  const selectEl = container.querySelector(".Select-select-FstK");
  if (!(selectEl instanceof HTMLElement)) return;
  container.setAttribute("data-selected-iban", acc.id);
  container.setAttribute("aria-expanded", "false");
  renderSelectedAccount(selectEl, acc);
  container.dispatchEvent(new CustomEvent("sbbol-account-change", { bubbles: true, detail: { iban: acc.id } }));
}

export function findAccountByIban(accounts: BankAccount[], iban: string): BankAccount | undefined {
  const norm = (s: string) => s.replace(/\s/g, "").toUpperCase();
  const target = norm(iban);
  return accounts.find((a) => norm(a.id) === target || a.id.includes(iban) || iban.includes(a.id));
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(value: string): string {
  return escapeHtml(value);
}
