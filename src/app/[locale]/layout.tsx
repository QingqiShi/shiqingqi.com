import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { notFound } from "next/navigation";
import { globalStyles } from "@/app/global-styles";
import { Header } from "@/components/shared/header";
import { i18nConfig } from "@/i18n-config";
import type { LayoutProps } from "@/types";
import { setCachedRequestLocale } from "@/utils/request-locale";
import { themeHack } from "@/utils/theme-hack";

export default async function RootLayout({ params, children }: LayoutProps) {
  const { locale } = await params;

  if (!i18nConfig.locales.includes(locale)) {
    notFound();
  }

  setCachedRequestLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {locale === "en" && (
          <link
            rel="preload"
            href="/InterVariableOptimized.woff2"
            as="font"
            type="font/woff2"
            crossOrigin="anonymous"
          />
        )}
      </head>
      <body css={globalStyles.body}>
        <script dangerouslySetInnerHTML={{ __html: themeHack }} />
        <Header />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
