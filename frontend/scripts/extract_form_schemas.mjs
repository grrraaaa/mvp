/**
 * One-off parser: extract SBBOL payment form field names/labels from raw HTML captures.
 * Usage: node scripts/extract_form_schemas.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RAW_HTML = path.join(__dirname, "../lib/sbbol/raw-html/payments-paydocbyn.html");
const OUT_DIR = path.join(__dirname, "../lib/sbbol/formSchemas");

const FORM_CONFIG = [
  { id: "paydocby", formName: "forms.PAYDOCBY", title: "Платежное поручение (BYN)" },
  { id: "instant", formName: "forms.INSTANT_PAYMENT_ORDER", title: "Мгновенный платёж" },
  { id: "paydoccur", formName: "forms.PAYDOCCUR", title: "Платежное поручение (валюта)" },
];

function extractFormChunk(html, formName) {
  const marker = `name="${formName}"`;
  const formIdx = html.indexOf(marker);
  if (formIdx === -1) return null;

  const formEnd = html.indexOf("</form>", formIdx);
  if (formEnd === -1) return null;

  return html.slice(formIdx - 2000, formEnd + 7);
}

function findLabelBefore(html, pos) {
  const before = html.slice(Math.max(0, pos - 1200), pos);

  const captions = [...before.matchAll(/Caption-caption[^>]*>([^<]+)</gi)];
  if (captions.length) return captions[captions.length - 1][1].trim();

  const labelMatch = before.match(/<label[^>]*>([^<]+)<\/label>\s*$/i);
  if (labelMatch) return labelMatch[1].trim();

  const ariaMatch = before.match(/aria-label="([^"]+)"/gi);
  if (ariaMatch?.length) {
    const last = ariaMatch[ariaMatch.length - 1];
    const m = last.match(/aria-label="([^"]+)"/i);
    if (m) return m[1].trim();
  }

  const titleMatch = before.match(/title="([^"]+)"/gi);
  if (titleMatch?.length) {
    const last = titleMatch[titleMatch.length - 1];
    const m = last.match(/title="([^"]+)"/i);
    if (m) return m[1].trim();
  }

  return null;
}

const RU_LABELS = {
  CONTRAGENT_ID: "Получатель / контрагент",
  COMMON_COLUMNS_CUSTOMER_ACCOUNT: "Со счёта",
  COMMON_COLUMNS_AMOUNT: "Сумма",
  PAYMENT_INDICATION: "Назначение платежа (код)",
  PAYMENT_PURPOSE: "Назначение платежа",
  PAYMENT_PURPOSE_CATEGORY: "Категория назначения платежа",
  PAYMENT_PURPOSE_CODE: "Код назначения платежа",
  COMMON_COLUMNS_DOC_NUMBER: "Номер документа",
  COMMON_COLUMNS_DOC_DATE: "Дата документа",
  PAYMENT_URGENCY: "Очередность платежа",
  CONTRAGENT_ACCOUNT: "Счёт получателя",
  CONTRAGENT_BANK_BIC: "БИК банка получателя",
  CONTRAGENT_UNP: "УНП получателя",
};

const RU_ALIASES = {
  COMMON_COLUMNS_CUSTOMER_ACCOUNT: ["счёт", "со счёта", "счет плательщика"],
  COMMON_COLUMNS_AMOUNT: ["сумма", "сумму"],
  PAYMENT_PURPOSE: ["назначение", "назначение платежа", "назначение оплаты"],
  COMMON_COLUMNS_DOC_NUMBER: ["номер документа", "номер", "№ документа"],
  COMMON_COLUMNS_DOC_DATE: ["дата документа", "дата"],
  PAYMENT_URGENCY: ["очередность", "очередность платежа"],
  CONTRAGENT_ID: ["получатель", "контрагент"],
  CONTRAGENT_ACCOUNT: ["счёт получателя", "счет получателя"],
  CONTRAGENT_BANK_BIC: ["бик", "бик банка"],
  CONTRAGENT_UNP: ["унп", "унп получателя"],
};

function parseFields(chunk, formPrefix) {
  const fields = [];
  const seen = new Set();

  const nameRe = /\bname="([^"]+)"/gi;
  let m;
  while ((m = nameRe.exec(chunk))) {
    const name = m[1];
    if (!name.startsWith(formPrefix) || seen.has(name)) continue;

    const tagSlice = chunk.slice(Math.max(0, m.index - 20), m.index + 200);
    const typeMatch = tagSlice.match(/\btype="([^"]+)"/i);
    const type = (typeMatch?.[1] || "text").toLowerCase();
    if (type === "hidden" || type === "submit" || type === "button") continue;

    const isInput =
      /<(input|textarea|select)\b/i.test(tagSlice) ||
      /\bcontenteditable/i.test(tagSlice);
    if (!isInput && !name.includes(".")) continue;

    seen.add(name);
    const shortKey = name.split(".").pop() || name;
    const label =
      findLabelBefore(chunk, m.index) ||
      RU_LABELS[shortKey] ||
      shortKey;
    const key = name.replace(/^forms\.[^.]+\./, "").replace(/\./g, "_");

    const extraAliases = RU_ALIASES[shortKey] ?? [];
    const aliases = [...new Set([label.toLowerCase(), ...extraAliases])].filter(Boolean);
    fields.push({ key, name, label, type, aliases });
  }

  return fields;
}

function main() {
  const html = fs.readFileSync(RAW_HTML, "utf-8");
  fs.mkdirSync(OUT_DIR, { recursive: true });

  for (const cfg of FORM_CONFIG) {
    const chunk = extractFormChunk(html, cfg.formName);
    if (!chunk) {
      console.warn(`Form not found: ${cfg.formName}`);
      continue;
    }

    const prefix = cfg.formName + ".";
    const fields = parseFields(chunk, prefix);

    const schema = {
      formType: cfg.id,
      formName: cfg.formName,
      title: cfg.title,
      fields,
    };

    const outPath = path.join(OUT_DIR, `${cfg.id}.json`);
    fs.writeFileSync(outPath, JSON.stringify(schema, null, 2), "utf-8");
    console.log(`Wrote ${outPath} (${fields.length} fields)`);
  }
}

main();
