/** «Демо-сегодня» и «последний месяц» по умолчанию для журнала документов.

Реальные сиды SBBOL-демо привязаны к маю-июню 2026 (см. backend/core/config.py
DEMO_STATEMENT_ANCHOR="06.06.2026"). Чтобы фильтр «по умолчанию» показывал
данные, а не пустоту, якорю «сейчас» на 11.06.2026 — а «последний месяц» =
май 2026 (предыдущий календарный). Логика совпадает с backend
`_parse_relative_period("за последний месяц")` в services/banking/queries.py.
*/

const DEMO_TODAY = new Date(2026, 5, 11); // 11.06.2026 — month=5 (zero-based)

/** Возвращает «последний месяц» (предыдущий календарный) — {year, month}. */
export function getDefaultLastMonth(now: Date = DEMO_TODAY): {
  year: number;
  month: number;
} {
  const idx = now.getFullYear() * 12 + now.getMonth() - 1;
  return { year: Math.floor(idx / 12), month: (idx % 12) + 1 };
}
