import { t } from "@tuja/i18n";
import { I18nProvider } from "@tuja/i18n/i18n-provider";
import { setLocale } from "@tuja/i18n/server-locale";
import type { PageProps } from "@tuja/i18n/types";
import { isValidLocale, validateLocale } from "@tuja/i18n/validate-locale";
import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";
import { PortalTargetProvider } from "@tuja/ui/components/portal-target-provider";
import { root } from "@tuja/ui/primitives/root.stylex";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  setLocale(validateLocale(params.locale));
  return {
    title: t({ en: "Finance", zh: "家庭账本" }),
    robots: { index: false, follow: false },
  };
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
        <link
          rel="preload"
          href="/InterVariableOptimized.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <I18nProvider locale={locale}>
          <script>{themeHack}</script>
          <ThemeApplier />
          <EffectLayerProvider>
            <PortalTargetProvider>
              <Suspense fallback={null}>{children}</Suspense>
            </PortalTargetProvider>
          </EffectLayerProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
