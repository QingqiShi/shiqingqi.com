import { I18nProvider } from "@tuja/i18n/i18n-provider";
import { setLocale } from "@tuja/i18n/server-locale";
import { isValidLocale } from "@tuja/i18n/validate-locale";
import { EffectLayerProvider } from "@tuja/ui/components/effect-layer-provider";
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

// Only allow locales defined in generateStaticParams, return 404 for others
export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "zh" }];
}

export default async function RootLayout({
  params,
  children,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!isValidLocale(locale)) {
    notFound();
  }

  setLocale(locale);

  return (
    <html
      lang={locale}
      className="motion-safe:scroll-smooth"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      {/* All page text is still Chinese in each locale. The browser picks
          the Chinese glyphs only when the text is marked as Chinese. */}
      <body lang="zh" className="min-h-dvh antialiased">
        <I18nProvider locale={locale}>
          <SerwistProvider
            swUrl="/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            <EffectLayerProvider>
              <PortalTargetProvider>{children}</PortalTargetProvider>
            </EffectLayerProvider>
          </SerwistProvider>
        </I18nProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
