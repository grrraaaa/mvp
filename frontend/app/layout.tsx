import type { Metadata } from "next";
<<<<<<< HEAD
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { getDemoPageFragment } from "@/lib/sbbol/demoPageHtml";

export const metadata: Metadata = {
  title: "СберБизнес — интернет-банк",
  description: "Демо СберБизнес с AI-консультантом и 3D-картой услуг sber-bank.by",
  icons: { icon: "/favicon-sbbol.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const documentModalHtml = getDemoPageFragment("document-types-modal") ?? "";

  return (
    <html lang="ru" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <AppProviders documentModalHtml={documentModalHtml}>{children}</AppProviders>
      </body>
=======
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
  title: "SberAI — Банковский ассистент",
  description: "AI-ассистент с 3D-навигацией по банковскому приложению",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className={inter.className}>{children}</body>
>>>>>>> 82fe250a275310d0168fa4893fe116fe006bdc42
    </html>
  );
}
