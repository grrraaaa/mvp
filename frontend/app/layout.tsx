import type { Metadata } from "next";
import "./globals.css";
import { AppProviders } from "@/components/layout/AppProviders";
import { getCapturedFragment } from "@/lib/sbbol/capturedOrigHtml";
import { CAPTURED_ORIG_STYLES } from "@/lib/sbbol/capturedOrigStyles";

export const metadata: Metadata = {
  title: "СберБизнес — интернет-банк",
  description: "Демо СберБизнес с AI-консультантом и 3D-картой услуг sber-bank.by",
  icons: { icon: "/favicon-sbbol.ico" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const documentModalHtml = getCapturedFragment("document-types-modal") ?? "";

  return (
    <html lang="ru" suppressHydrationWarning>
      <head>
        {CAPTURED_ORIG_STYLES.map((href) => (
          <link key={href} rel="stylesheet" href={href} />
        ))}
      </head>
      <body suppressHydrationWarning>
        <AppProviders documentModalHtml={documentModalHtml}>{children}</AppProviders>
      </body>
    </html>
  );
}
