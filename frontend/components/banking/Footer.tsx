"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer className="w-full bg-slate-50 border-t border-gray-200 py-6 px-10 text-xs text-gray-500 font-sans mt-auto">
      <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span>© ОАО «Сбер Банк», 2026</span>
          <a
            href="https://www.sber-bank.by"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sky-600 hover:underline hover:text-sky-800 transition-colors"
          >
            www.sber-bank.by
          </a>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-center">
          <span className="font-medium text-gray-700">Центр клиентской поддержки:</span>
          <div className="flex items-center gap-4 text-gray-600">
            <span className="hover:text-emerald-700 cursor-pointer font-medium">+375 17 359-99-11</span>
            <span className="hover:text-emerald-700 cursor-pointer font-medium">+375 29 359-99-11</span>
            <span className="hover:text-emerald-700 cursor-pointer font-medium">+375 33 348-99-11</span>
          </div>
        </div>
        <div>
          <Link href="/settings/security" className="text-sky-600 hover:underline hover:text-sky-800 transition-colors">
            Политика обработки персональных данных
          </Link>
        </div>
      </div>
    </footer>
  );
}
