import * as stylex from "@stylexjs/stylex";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { globalStyles } from "@/app/globalStyles";
import { getTranslations } from "@/app/translations/getTranslations";
import { breakpoints } from "@/breakpoints";
import { FlowGradient } from "@/server-components/flow-gradient";
import { Footer } from "@/server-components/footer";
import { Header } from "@/server-components/header";
import { tokens } from "@/tokens.stylex";
import type { LayoutProps, PageProps, SupportedLocale } from "@/types";
import { themeHack } from "@/utils/theme-hack";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps) {
  const params = await props.params;
  const { t } = getTranslations(translations, params.locale);
  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
    applicationName: t("title"),
    manifest: "/manifest.json",
  } satisfies Metadata;
}

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
      <body {...stylex.props(globalStyles.global, globalStyles.body)}>
        <script dangerouslySetInnerHTML={{ __html: themeHack }} />
        <div {...stylex.props(styles.flowGradient)} role="presentation">
          <Suspense fallback={<></>}>
            <FlowGradient />
          </Suspense>
        </div>
        <div {...stylex.props(styles.glow)} role="presentation" />
        <div {...stylex.props(styles.container)}>
          <div {...stylex.props(styles.wrapperInner)}>
            <Header params={params} />
            <div {...stylex.props(styles.linesContainer)} role="presentation">
              <div
                {...stylex.props(styles.line, styles.line1)}
                role="presentation"
              />
              <div
                {...stylex.props(styles.line, styles.line2)}
                role="presentation"
              />
              <div
                {...stylex.props(styles.line, styles.line3)}
                role="presentation"
              />
              <div
                {...stylex.props(styles.line, styles.line4)}
                role="presentation"
              />
              <div
                {...stylex.props(styles.line, styles.line5)}
                role="presentation"
              />
            </div>
            <main {...stylex.props(styles.main)}>{children}</main>
            <Footer locale={locale} />
          </div>
        </div>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}

const styles = stylex.create({
  container: {
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${tokens.layoutPaddingBase} + env(safe-area-inset-left))`,
    paddingRight: `calc(${tokens.layoutPaddingBase} + env(safe-area-inset-right))`,
  },
  wrapperInner: {
    position: "relative",
  },
  linesContainer: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 0,
    pointerEvents: "none",
    opacity: 0.24,
  },
  line: {
    display: "none",
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "0.0625rem",
    backgroundImage: `linear-gradient(${tokens.textMuted} 33%, rgba(255, 255, 255, 0) 0%)`,
    backgroundPosition: "right",
    backgroundSize: "0.0625rem 0.3125rem",
    backgroundRepeat: "repeat-y",
  },
  line1: {
    display: "block",
    left: "0",
  },
  line2: {
    display: { default: "none", [breakpoints.sm]: "block" },
    left: {
      default: null,
      [breakpoints.sm]: "50%",
      [breakpoints.md]: "33.3%",
      [breakpoints.lg]: "25%",
    },
  },
  line3: {
    display: { default: "none", [breakpoints.md]: "block" },
    left: { default: null, [breakpoints.md]: "66.6%", [breakpoints.lg]: "50%" },
  },
  line4: {
    display: { default: "none", [breakpoints.lg]: "block" },
    left: { default: null, [breakpoints.lg]: "75%" },
  },
  line5: {
    display: "block",
    left: "100%",
  },
  main: {
    paddingTop: {
      default: "6rem",
      [breakpoints.sm]: "9rem",
      [breakpoints.md]: "11rem",
    },
  },
  flowGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    height: {
      default: "30rem",
      [breakpoints.sm]: "30rem",
      [breakpoints.md]: "35rem",
      [breakpoints.lg]: "30rem",
      [breakpoints.xl]: "max(35rem, 80dvh)",
    },
  },
  glow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    overflow: "hidden",
    pointerEvents: "none",
    background: `radial-gradient(circle calc(${tokens.layoutGlowHeight}*5) at center calc(${tokens.layoutGlowHeight}*5), ${tokens.controlActive} calc(${tokens.layoutGlowHeight}*4), transparent)`,
    opacity: tokens.glowOpacity,
    height: tokens.layoutGlowHeight,
  },
});
