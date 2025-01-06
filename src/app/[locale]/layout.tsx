import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { redirect } from "next/navigation";
import { globalStyles } from "@/app/globalStyles";
import { Header } from "@/server-components/shared/header";
import type { LayoutProps, SupportedLocale } from "@/types";
import { themeHack } from "@/utils/theme-hack";

function validateLocale(locale: string): locale is SupportedLocale {
  return locale === "en" || locale === "zh";
}

export default async function RootLayout({ params, children }: LayoutProps) {
  const { locale } = await params;

  if (!validateLocale(locale)) {
    redirect("/");
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
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
        <script dangerouslySetInnerHTML={{ __html: themeHack }} />
        <Header params={params} />
        {children}
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
