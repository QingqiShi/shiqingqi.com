import { VercelObservability } from "@tuja/analytics/vercel-observability";
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
import { DEV } from "esm-env";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SerwistProvider } from "#src/pwa/serwist-provider.tsx";
import icon16 from "#src/pwa/trips-icon-16.png";
import appleIcon from "#src/pwa/trips-icon-180.png";
import icon32 from "#src/pwa/trips-icon-32.png";
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
    icons: {
      // The 16px and 32px icons draw the route larger and thicker. When a
      // browser tab makes the 192px icon smaller, the dots of the route go.
      icon: [
        { url: icon16.src, sizes: "16x16", type: "image/png" },
        { url: icon32.src, sizes: "32x32", type: "image/png" },
        { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      ],
      apple: { url: appleIcon.src, sizes: "180x180", type: "image/png" },
    },
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
            disable={DEV}
            // A reload when the device comes online discards what is on the
            // screen, also a page load that is in progress. Only the offline
            // page loads again (`ReloadWhenOnline`).
            reloadOnOnline={false}
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
        <VercelObservability />
      </body>
    </html>
  );
}
