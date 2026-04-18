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
import { BackOverrideProvider } from "#src/contexts/back-override-context.tsx";
import { I18nProvider } from "#src/i18n/i18n-provider.tsx";
import { setLocale } from "#src/i18n/server-locale.ts";
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

  setLocale(locale);

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        {/* Cleanup old service worker at /serwist/sw.js - can be removed after migration */}
        {/* eslint-disable @eslint-react/dom-no-dangerously-set-innerhtml -- Intentional inline scripts for service worker cleanup and theme initialization */}
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
        {/* eslint-enable @eslint-react/dom-no-dangerously-set-innerhtml */}
        {/*
          Both locales render Latin text in Inter (names, dates, brand
          wordmarks, numbers), so both locales benefit from preloading it.
          The `@font-face` `unicode-range` limits Inter to Latin glyphs, so
          CJK-only text still falls through to system fonts — the preload
          warms the cache for the mixed-content case without wasting bytes
          on pure-CJK runs.
        */}
        <link
          rel="preload"
          href="/InterVariableOptimized.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body css={globalStyles.body}>
        <I18nProvider locale={locale}>
          <SerwistProvider
            swUrl="/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            {/* eslint-disable-next-line @eslint-react/dom-no-dangerously-set-innerhtml -- Intentional inline script for theme initialization before hydration */}
            <script dangerouslySetInnerHTML={{ __html: themeHack }} />
            <ViewTransition>
              <PortalTargetProvider>
                <BackOverrideProvider>
                  <Suspense fallback={<HeaderSkeleton />}>
                    <Header locale={locale} />
                  </Suspense>
                  <Suspense fallback={null}>{children}</Suspense>
                </BackOverrideProvider>
              </PortalTargetProvider>
            </ViewTransition>
            <Analytics />
            <SpeedInsights />
          </SerwistProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
