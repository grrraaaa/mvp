import type { Metadata } from "next";
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
    </html>
  );
}
