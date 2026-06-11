"use client";

import { useEffect } from "react";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";

const VALIDATION_CLASS = "assistant-field-validation";

function parseAmount(raw: string): number {
  const n = Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

function validateField(el: HTMLInputElement | HTMLTextAreaElement): "ok" | "warn" | "error" {
  const name = el.name || "";
  const val = el.value.trim();
  if (name.includes("UNP") || name.includes("UNP")) {
    const digits = val.replace(/\D/g, "");
    if (!digits) return "error";
    if (digits.length !== 9) return "error";
    return "ok";
  }
  if (name.includes("ACCOUNT") || name.includes("IBAN")) {
    const compact = val.replace(/\s/g, "").toUpperCase();
    if (!compact.startsWith("BY") || compact.length !== 28) return "error";
    return "ok";
  }
  if (name.includes("AMOUNT")) {
    const amt = parseAmount(val);
    if (amt <= 0) return "error";
    if (amt > 5000) return "warn";
    return "ok";
  }
  if (name.includes("PURPOSE")) {
    const minLen = name.includes("INSTANT") ? 2 : 5;
    if (!val) return "warn";
    if (val.length < minLen) return "warn";
  }
  return "ok";
}

function applyValidationBorder(el: HTMLElement, level: "ok" | "warn" | "error") {
  el.classList.remove(`${VALIDATION_CLASS}-ok`, `${VALIDATION_CLASS}-warn`, `${VALIDATION_CLASS}-error`);
  el.classList.add(`${VALIDATION_CLASS}-${level}`);
  const color =
    level === "error" ? "#e53935" : level === "warn" ? "#f9a825" : "#21A038";
  el.style.boxShadow = `inset 0 0 0 2px ${color}`;
}

export function useSbbolPaymentValidation(rootRef: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const onInput = (e: Event) => {
      const t = e.target;
      if (!(t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement)) return;
      if (!t.name?.includes("forms.")) return;
      applyValidationBorder(t, validateField(t));
    };

    root.addEventListener("input", onInput, true);
    root.addEventListener("change", onInput, true);
    return () => {
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("change", onInput, true);
    };
  }, [rootRef]);
}

export function highlightOcrFields(root: HTMLElement) {
  root.querySelectorAll("input[name*='forms.'], textarea[name*='forms.']").forEach((el) => {
    if (el instanceof HTMLElement && (el as HTMLInputElement).value?.trim()) {
      el.classList.add("assistant-ocr-filled");
      applyValidationBorder(el, validateField(el as HTMLInputElement));
    }
  });
}

export async function submitPaymentFormFromDom(root: HTMLElement): Promise<{ ok: boolean; message: string }> {
  const getVal = (part: string) => {
    const el = root.querySelector(`[name*="${part}"]`) as HTMLInputElement | null;
    return el?.value?.trim() ?? "";
  };

  const counterparty = getVal("CONTRAGENT") || getVal("RECIPIENT") || "Контрагент";
  const amount = parseAmount(getVal("AMOUNT") || "0");
  const purpose = getVal("PURPOSE") || getVal("DETAILS") || "";
  const currency = root.querySelector("[name*='CURRENCY']")?.textContent?.includes("USD") ? "USD" : "BYN";

  const critical: string[] = [];
  root.querySelectorAll("input[name*='forms.'], textarea[name*='forms.']").forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const level = validateField(el);
      applyValidationBorder(el, level);
      if (level === "error") critical.push(el.name);
    }
  });

  if (critical.length > 0) {
    return {
      ok: false,
      message: `Отправка заблокирована: исправьте ${critical.length} поле(я) с красной рамкой (УНП, IBAN, сумма).`,
    };
  }

  const res = await fetch(apiUrl("/api/banking/documents"), {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...authHeaders() },
    body: JSON.stringify({
      type: "Перевод в BYN",
      counterparty,
      amount,
      currency,
      purpose,
      status: "На подписи",
    }),
  });

  if (!res.ok) {
    return { ok: false, message: `Ошибка API: ${res.status}` };
  }

  const doc = await res.json();
  await fetch(apiUrl(`/api/banking/documents/${encodeURIComponent(doc.id)}/submit-gateway`), {
    method: "POST",
    credentials: "same-origin",
    headers: authHeaders(),
  }).catch(() => null);

  return { ok: true, message: `Документ ${doc.id} создан и отправлен в шлюз (демо).` };
}
