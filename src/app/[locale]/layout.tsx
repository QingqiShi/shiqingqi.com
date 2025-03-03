import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { globalStyles } from "@/app/global-styles";
import { Header } from "@/components/shared/header";
import { HeaderSkeleton } from "@/components/shared/header-skeleton";
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
        {process.env.NODE_ENV === "development" && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" />
        )}
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
        <Suspense fallback={<HeaderSkeleton />}>
          <Header locale={locale} />
        </Suspense>
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
