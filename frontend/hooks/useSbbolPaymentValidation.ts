"use client";

import { useEffect } from "react";
import { apiUrl } from "@/lib/api/baseUrl";
import { authHeaders } from "@/lib/auth/tokenRef";

const VALIDATION_CLASS = "assistant-field-validation";

const DATE_PATTERN = /^(\d{2})\.(\d{2})\.(\d{4})$/;

function parseAmount(raw: string): number {
  const n = Number.parseFloat(raw.replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

/** Только валидация полей с датой. Любые другие поля (УНП, IBAN, сумма,
 *  назначение и т.п.) валидацию не проходят — пользователь явно попросил
 *  оставить в форме платежа только проверки про даты. */
function validateField(el: HTMLInputElement | HTMLTextAreaElement): "ok" | "warn" | "error" {
  const name = el.name || "";
  const val = el.value.trim();
  if (!name.includes("DATE")) return "ok";

  if (!val) return "warn";
  const m = DATE_PATTERN.exec(val);
  if (!m) return "error";
  const dd = Number(m[1]);
  const mm = Number(m[2]);
  const yyyy = Number(m[3]);
  if (mm < 1 || mm > 12) return "error";
  if (dd < 1 || dd > 31) return "error";
  if (yyyy < 2000 || yyyy > 2100) return "error";
  // Простая проверка существования даты (напр. 31.02 отлавливаем).
  const probe = new Date(yyyy, mm - 1, dd);
  if (
    probe.getFullYear() !== yyyy ||
    probe.getMonth() !== mm - 1 ||
    probe.getDate() !== dd
  ) {
    return "error";
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

  const badDates: string[] = [];
  root.querySelectorAll("input[name*='forms.'], textarea[name*='forms.']").forEach((el) => {
    if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
      const level = validateField(el);
      applyValidationBorder(el, level);
      if (level === "error" && el.name.includes("DATE")) badDates.push(el.name);
    }
  });

  if (badDates.length > 0) {
    return {
      ok: false,
      message: `Отправка заблокирована: некорректный формат даты в ${badDates.length} поле(я) (ожидается ДД.ММ.ГГГГ).`,
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
