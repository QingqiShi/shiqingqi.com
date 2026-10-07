import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";
import { root } from "@tuja/ui/primitives/root.stylex";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostHogInit } from "#src/analytics/posthog-init.tsx";
import { I18nProvider } from "#src/i18n/i18n-provider.tsx";
import { setLocale } from "#src/i18n/server-locale.ts";
import { isValidLocale } from "#src/i18n/validate-locale.ts";
import { SerwistProvider } from "#src/pwa/serwist-provider.tsx";
import { BackOverrideProvider } from "#src/site-shell/back-override-provider.tsx";
import { InlineScript } from "#src/site-shell/inline-script.tsx";
import { PortalTargetProvider } from "#src/site-shell/portal-target-provider.tsx";
import { ReactGrab } from "#src/site-shell/react-grab.tsx";
import { globalStyles } from "#src/theme/global-styles.ts";
import { themeHack } from "#src/theme/theme-hack.ts";

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
      <body css={[root.body, globalStyles.body]}>
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
        <I18nProvider locale={locale}>
          <SerwistProvider>
            <InlineScript html={themeHack} />
            <EffectLayerProvider>
              <PortalTargetProvider>
                <BackOverrideProvider>
                  <Suspense fallback={null}>{children}</Suspense>
                </BackOverrideProvider>
              </PortalTargetProvider>
            </EffectLayerProvider>
            <ReactGrab />
            <PostHogInit />
          </SerwistProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
