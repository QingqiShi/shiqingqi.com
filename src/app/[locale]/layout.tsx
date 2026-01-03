import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense, ViewTransition } from "react";
import { globalStyles } from "#src/app/global-styles.ts";
import { SerwistProvider } from "#src/components/serwist-provider.tsx";
import { PortalTargetProvider } from "#src/components/shared/fixed-element-portal-target.tsx";
import { HeaderSkeleton } from "#src/components/shared/header-skeleton.tsx";
import { Header } from "#src/components/shared/header.tsx";
import { i18nConfig } from "#src/i18n-config.ts";
import type { SupportedLocale } from "#src/types.ts";
import { themeHack } from "#src/utils/theme-hack.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  viewportFit: "cover",
};

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
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <script dangerouslySetInnerHTML={{ __html: themeHack }} />
          <ViewTransition>
            <PortalTargetProvider>
              <Suspense fallback={<HeaderSkeleton />}>
                <Header locale={validatedLocale} />
              </Suspense>
              <Suspense fallback={null}>{children}</Suspense>
            </PortalTargetProvider>
          </ViewTransition>
          <Analytics />
          <SpeedInsights />
        </SerwistProvider>
      </body>
    </html>
  );
}
