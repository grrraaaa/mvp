"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import type { SyntheticPageBody as PageBody } from "@/lib/sbbol/syntheticPageContent";
import { showStubToast } from "@/lib/sbbol/stubToast";

interface Props {
  body: PageBody;
}

export function SyntheticPageBody({ body }: Props) {
  const router = useRouter();
  const toolbar = body.toolbar;
  const form = body.type === "form" ? body.form : undefined;

  return (
    <div className="space-y-4">
      {toolbar && (
        <div className="flex flex-wrap items-center gap-3">
          {toolbar.primaryAction && (
            <button type="button" className="sbbol-btn-primary h-10 px-5 text-sm" onClick={() => showStubToast(`${toolbar.primaryAction} (демо)`)}>
              {toolbar.primaryAction}
            </button>
          )}
          {toolbar.search && (
            <div className="flex-1 min-w-[200px] max-w-md relative">
              <input
                type="search"
                placeholder="Поиск"
                className="w-full h-10 pl-10 pr-4 rounded-md border border-[#d0d7dd] bg-white text-sm text-[#1f1f22] placeholder:text-[#7d838a] focus:outline-none focus:border-[#107f8c]"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[#7d838a]">
                <img src="/sber-orig/images/ic_search.svg" alt="" width={16} height={16} />
              </span>
            </div>
          )}
          {toolbar.filters?.map((f) => (
            <button
              key={f}
              type="button"
              className="h-10 px-4 rounded-md border border-[#d0d7dd] bg-white text-sm text-[#565b62] hover:border-[#107f8c] hover:text-[#107f8c] transition-colors"
              onClick={() => showStubToast(`Фильтр «${f}» — демо-режим`)}
            >
              {f} ▾
            </button>
          ))}
        </div>
      )}

      {body.tabs && (
        <div className="flex gap-1 border-b border-[#e4e8eb]">
          {body.tabs.map((tab, i) => (
            <button
              key={tab}
              type="button"
              className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                i === (body.activeTab ?? 0)
                  ? "border-[#107f8c] text-[#107f8c]"
                  : "border-transparent text-[#565b62] hover:text-[#1f1f22]"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      )}

      {body.type === "table" && body.table && (
        <div className="bg-white rounded-[10px] border border-[#e4e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#f8f9fb] border-b border-[#e4e8eb]">
                  {body.table.columns.map((col) => (
                    <th
                      key={col.key}
                      className={`px-5 py-3 font-semibold text-[#565b62] text-left ${
                        col.align === "right" ? "text-right" : ""
                      }`}
                    >
                      {col.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {body.table.rows.map((row, ri) => {
                  const href = row._href;
                  return (
                    <tr
                      key={ri}
                      className={`border-b border-[#e4e8eb] last:border-b-0 hover:bg-[#f8f9fb] transition-colors ${
                        href ? "cursor-pointer" : ""
                      }`}
                      onClick={href ? () => router.push(href) : undefined}
                      tabIndex={href ? 0 : undefined}
                      role={href ? "link" : undefined}
                      onKeyDown={
                        href
                          ? (e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                router.push(href);
                              }
                            }
                          : undefined
                      }
                    >
                      {body.table!.columns.map((col, ci) => (
                        <td
                          key={col.key}
                          className={`px-5 py-3.5 ${
                            href && ci === 0
                              ? "text-[#107f8c] font-medium"
                              : "text-[#1f1f22]"
                          } ${col.align === "right" ? "text-right font-medium" : ""}`}
                        >
                          {row[col.key] || "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {form && (
        <div className="bg-white rounded-[10px] border border-[#e4e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
          <div className="grid sm:grid-cols-2 gap-5">
            {form.fields.map((field) => (
              <div key={field.label} className={field.wide ? "sm:col-span-2" : ""}>
                <label className="block text-xs font-semibold text-[#565b62] mb-1.5 uppercase tracking-wide">
                  {field.label}
                </label>
                {field.type === "textarea" ? (
                  <textarea
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-md border border-[#d0d7dd] text-sm text-[#1f1f22] focus:outline-none focus:border-[#107f8c] resize-y"
                  />
                ) : field.type === "select" ? (
                  <select
                    defaultValue={field.value}
                    className="w-full h-10 px-3 rounded-md border border-[#d0d7dd] bg-white text-sm text-[#1f1f22] focus:outline-none focus:border-[#107f8c]"
                  >
                    {field.options?.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={field.type ?? "text"}
                    defaultValue={field.value}
                    placeholder={field.placeholder}
                    className="w-full h-10 px-3 rounded-md border border-[#d0d7dd] text-sm text-[#1f1f22] focus:outline-none focus:border-[#107f8c]"
                  />
                )}
              </div>
            ))}
          </div>
          {form.submitLabel && (
            <div className="mt-6 pt-4 border-t border-[#e4e8eb]">
              <button type="button" className="sbbol-btn-primary h-10 px-6 text-sm" onClick={() => showStubToast(`${form.submitLabel} (демо)`)}>
                {form.submitLabel}
              </button>
            </div>
          )}
        </div>
      )}

      {body.type === "cards" && body.cards && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {body.cards.map((card) => (
            <div
              key={card.title}
              className="bg-white rounded-[10px] border border-[#e4e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden hover:border-[#90d0cc] hover:shadow-[0_4px_12px_rgba(16,127,140,0.12)] transition-all cursor-pointer group"
            >
              {card.image && (
                <div className="relative h-32 bg-[#f2f4f7] overflow-hidden">
                  <Image src={card.image} alt="" fill className="object-cover opacity-90 group-hover:scale-105 transition-transform" unoptimized />
                </div>
              )}
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-[#1f1f22] group-hover:text-[#107f8c] transition-colors">
                    {card.title}
                  </h3>
                  {card.badge && (
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded bg-[#e5fcf7] text-[#107f8c]">
                      {card.badge}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[#7d838a] mt-2">{card.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {body.type === "info" && body.info && (
        <div className="bg-white rounded-[10px] border border-[#e4e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
          <div className="flex flex-col md:flex-row">
            {body.info.image && (
              <div className="relative w-full md:w-64 h-48 md:h-auto shrink-0 bg-[#f2f4f7]">
                <Image src={body.info.image} alt="" fill className="object-cover" unoptimized />
              </div>
            )}
            <div
              className="p-6 text-sm text-[#565b62] leading-relaxed [&_p]:mb-3 [&_strong]:text-[#1f1f22]"
              dangerouslySetInnerHTML={{ __html: body.info.html }}
            />
          </div>
        </div>
      )}

      {body.type === "exchange" && body.rates && (
        <div className="bg-white rounded-[10px] border border-[#e4e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#f8f9fb] border-b border-[#e4e8eb]">
                <th className="px-5 py-3 font-semibold text-[#565b62] text-left">Валюта</th>
                <th className="px-5 py-3 font-semibold text-[#565b62] text-right">Покупка</th>
                <th className="px-5 py-3 font-semibold text-[#565b62] text-right">Продажа</th>
                <th className="px-5 py-3 font-semibold text-[#565b62] text-right">НБРБ</th>
              </tr>
            </thead>
            <tbody>
              {body.rates.map((r) => (
                <tr key={r.currency} className="border-b border-[#e4e8eb] last:border-b-0 hover:bg-[#f8f9fb]">
                  <td className="px-5 py-3.5 font-semibold text-[#1f1f22]">{r.currency}</td>
                  <td className="px-5 py-3.5 text-right text-[#107f8c]">{r.buy}</td>
                  <td className="px-5 py-3.5 text-right text-[#d64545]">{r.sell}</td>
                  <td className="px-5 py-3.5 text-right text-[#565b62]">{r.nbrb}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="px-5 py-3 text-xs text-[#7d838a] border-t border-[#e4e8eb]">
            Курсы на 31.05.2026, обновлены в 10:00
          </p>
        </div>
      )}

      {body.type === "profile" && body.info && (
        <div className="bg-white rounded-[10px] border border-[#e4e8eb] shadow-[0_2px_8px_rgba(0,0,0,0.05)] p-6">
          <div className="flex items-center gap-4 mb-6">
            <span className="w-16 h-16 rounded-full bg-[#90d0cc] flex items-center justify-center text-xl font-semibold text-[#005e7f]">
              D
            </span>
            <div
              className="text-sm text-[#565b62] [&_p]:mb-1 [&_strong]:text-lg [&_strong]:text-[#1f1f22] [&_strong]:block"
              dangerouslySetInnerHTML={{ __html: body.info.html }}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {["Редактировать профиль", "Управление пользователями", "Уведомления", "Язык интерфейса"].map((item) => (
              <button
                key={item}
                type="button"
                className="text-left px-4 py-3 rounded-md border border-[#e4e8eb] text-sm text-[#1f1f22] hover:border-[#90d0cc] hover:bg-[#f8f9fb] transition-colors"
              >
                {item}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
