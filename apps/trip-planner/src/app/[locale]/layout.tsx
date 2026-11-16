import { t } from "@tuja/i18n";
import { I18nProvider } from "@tuja/i18n/i18n-provider";
import { setLocale } from "@tuja/i18n/server-locale";
import type { PageProps } from "@tuja/i18n/types";
import { isValidLocale, validateLocale } from "@tuja/i18n/validate-locale";
import { RouterLink } from "@tuja/next-links/router-link";
import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";
import { LinkProvider } from "@tuja/ui/components/link-provider";
import { PortalTargetProvider } from "@tuja/ui/components/portal-target-provider";
import { root } from "@tuja/ui/primitives/root.stylex";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SerwistProvider } from "#src/pwa/serwist-provider.tsx";
import { globalStyles } from "#src/theme/global-styles.ts";
import { ThemeApplier } from "#src/theme/theme-applier.tsx";
import { themeHack } from "#src/theme/theme-hack.ts";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  setLocale(validateLocale((await props.params).locale));
  return {
    title: {
      default: t({ en: "Trips", zh: "旅行计划" }),
      template: t({ en: "%s · Trips", zh: "%s · 旅行计划" }),
    },
    description: t({
      en: "Road trips day by day: plans, places, restaurants and stays.",
      zh: "自驾行程：每日安排、景点、餐厅与住宿。",
    }),
    robots: { index: false, follow: false },
  };
}

export default async function LocaleLayout({
  params,
  children,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
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
          <SerwistProvider
            swUrl="/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            <script>{themeHack}</script>
            <ThemeApplier />
            <EffectLayerProvider>
              <PortalTargetProvider>
                <LinkProvider linkComponent={RouterLink}>
                  {children}
                </LinkProvider>
              </PortalTargetProvider>
            </EffectLayerProvider>
          </SerwistProvider>
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
