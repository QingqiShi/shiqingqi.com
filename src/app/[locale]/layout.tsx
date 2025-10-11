import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { globalStyles } from "@/app/global-styles";
import { SerwistProvider } from "@/components/serwist-provider";
import { Header } from "@/components/shared/header";
import { HeaderSkeleton } from "@/components/shared/header-skeleton";
import { i18nConfig } from "@/i18n-config";
import type { SupportedLocale } from "@/types";
import { themeHack } from "@/utils/theme-hack";
import { validateLocale } from "@/utils/validate-locale";

export default async function RootLayout({
  params,
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  if (!i18nConfig.locales.includes(validatedLocale)) {
    notFound();
  }

  return (
    <html lang={validatedLocale} suppressHydrationWarning>
      <head>
        {process.env.NODE_ENV === "development" && (
          // eslint-disable-next-line @next/next/no-sync-scripts
          <script src="https://unpkg.com/react-scan/dist/auto.global.js" />
        )}
        {validatedLocale === "en" && (
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
        <SerwistProvider swUrl="/serwist/sw.js">
          <script dangerouslySetInnerHTML={{ __html: themeHack }} />
          <Suspense fallback={<HeaderSkeleton />}>
            <Header locale={validatedLocale} />
          </Suspense>
          {children}
          <Analytics />
          <SpeedInsights />
        </SerwistProvider>
      </body>
    </html>
  );
}
