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
import { webAppMetadata } from "#src/assistant/pwa/web-app-metadata.ts";
import { SerwistProvider } from "#src/pwa/serwist-provider.tsx";
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
  const locale = validateLocale(params.locale);
  setLocale(locale);
  return {
    title: {
      default: t({ en: "Mail Assistant", zh: "邮件助手" }),
      template: t({ en: "%s | Mail Assistant", zh: "%s | 邮件助手" }),
    },
    robots: { index: false, follow: false },
    ...webAppMetadata(locale),
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
          href="/fonts/haffer-1/Haffer-Regular.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <link
          rel="preload"
          href="/fonts/haffer-1/Haffer-SemiBold.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
        <I18nProvider locale={locale}>
          <SerwistProvider>
            <script>{themeHack}</script>
            <ThemeApplier />
            <EffectLayerProvider>
              <PortalTargetProvider>
                <Suspense fallback={null}>{children}</Suspense>
              </PortalTargetProvider>
            </EffectLayerProvider>
          </SerwistProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
