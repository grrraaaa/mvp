import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function extract(html, formName) {
  const marker = `name="${formName}"`;
  const formIdx = html.indexOf(marker);
  const wrapperIdx = html.lastIndexOf('class="mainContentWrapper"', formIdx);
  const divStart = html.lastIndexOf("<div", wrapperIdx);
  const formEnd = html.indexOf("</form>", formIdx);
  const afterForm = html.slice(formEnd + 7, formEnd + 55);
  const closing = afterForm.match(/^((?:<\/div>)+)/)?.[1] ?? "</div></div></div></div>";
  return html.slice(divStart, formEnd + 7) + closing;
}

const raw = fs
  .readFileSync(path.join(__dirname, "../lib/sbbol/raw-html/payments-paydocbyn.html"), "utf8")
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");

const extracted = extract(raw, "forms.PAYDOCBY");

for (const key of ["PAYMENT_PURPOSE", "COMMON_COLUMNS_DOC_NUMBER", "COMMON_COLUMNS_DOC_DATE"]) {
  const needle = `PAYDOCBY.${key}`;
  const i = extracted.indexOf(needle);
  console.log(`\n=== ${key} ===`);
  console.log(extracted.slice(i - 150, i + 450));
}
