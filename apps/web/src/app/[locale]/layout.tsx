import { I18nProvider } from "@tuja/i18n/i18n-provider";
import { setLocale } from "@tuja/i18n/server-locale";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";
import { PortalTargetProvider } from "@tuja/ui/components/portal-target-provider";
import { root } from "@tuja/ui/primitives/root.stylex";
import type { Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { PostHogInit } from "#src/analytics/posthog-init.tsx";
import { SerwistProvider } from "#src/pwa/serwist-provider.tsx";
import { BackOverrideProvider } from "#src/site-shell/back-override-provider.tsx";
import { InlineScript } from "#src/site-shell/inline-script.tsx";
import { ReactGrab } from "#src/site-shell/react-grab.tsx";
import { globalStyles } from "#src/theme/global-styles.ts";
import { ThemeApplier } from "#src/theme/theme-applier.tsx";
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
            <InlineScript>{themeHack}</InlineScript>
            <ThemeApplier />
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
