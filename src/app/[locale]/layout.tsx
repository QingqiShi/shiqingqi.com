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
import { themeHack } from "#src/utils/theme-hack.ts";
import { isValidLocale } from "#src/utils/validate-locale.ts";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1.0,
  viewportFit: "cover",
};

// Only allow locales defined in generateStaticParams, return 404 for others
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default async function RootLayout({
  params,
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Cleanup old service worker at /serwist/sw.js - can be removed after migration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.getRegistrations().then(function(registrations) {
                  for (var i = 0; i < registrations.length; i++) {
                    var reg = registrations[i];
                    if (reg.active && reg.active.scriptURL.indexOf('/serwist/') !== -1) {
                      reg.unregister().then(function() { location.reload(); });
                    }
                  }
                });
              }
            `,
          }}
        />
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
        <SerwistProvider
          swUrl="/sw.js"
          disable={process.env.NODE_ENV === "development"}
        >
          <script dangerouslySetInnerHTML={{ __html: themeHack }} />
          <ViewTransition>
            <PortalTargetProvider>
              <Suspense fallback={<HeaderSkeleton />}>
                <Header locale={locale} />
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
