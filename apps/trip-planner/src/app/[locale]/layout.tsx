import { I18nProvider } from "@tuja/i18n/i18n-provider";
import { setLocale } from "@tuja/i18n/server-locale";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import { RouterLink } from "@tuja/next-links/router-link";
import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";
import { LinkProvider } from "@tuja/ui/components/link-provider";
import { PortalTargetProvider } from "@tuja/ui/components/portal-target-provider";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { SerwistProvider } from "@/pwa/serwist-provider";

export const metadata: Metadata = {
  title: "旅行计划",
  description: "自驾行程：每日安排、景点、餐厅与住宿。",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
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
    // All of the text on these screens is Chinese in both locales. The `lang`
    // attribute selects the Chinese glyphs, so it stays "zh" until the
    // screens are translated.
    <html
      lang="zh"
      className="motion-safe:scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <body className="min-h-dvh antialiased">
        <I18nProvider locale={locale}>
          <SerwistProvider
            swUrl="/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
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
