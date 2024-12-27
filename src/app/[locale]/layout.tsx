import * as stylex from "@stylexjs/stylex";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FlowGradient } from "../../server-components/flow-gradient";
import { Footer } from "../../server-components/footer";
import { Header } from "../../server-components/header";
import { tokens } from "../../tokens.stylex";
import type {
  Breakpoints,
  LayoutProps,
  PageProps,
  SupportedLocale,
} from "../../types";
import { themeHack } from "../../utils/theme-hack";
import { globalStyles } from "../globalStyles";
import { getTranslations } from "../translations/getTranslations";
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
        <div {...stylex.props(styles.maskContainer)} role="presentation">
          <div {...stylex.props(styles.mask)} />
        </div>
        <div {...stylex.props(styles.glowContainer)} role="presentation">
          <div {...stylex.props(styles.glow)} />
        </div>
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

const sm: Breakpoints["sm"] =
  "@media (min-width: 320px) and (max-width: 767px)";
const minSm: Breakpoints["minSm"] = "@media (min-width: 320px)";
const md: Breakpoints["md"] =
  "@media (min-width: 768px) and (max-width: 1079px)";
const minMd: Breakpoints["minMd"] = "@media (min-width: 768px)";
const lg: Breakpoints["lg"] =
  "@media (min-width: 1080px) and (max-width: 1999px)";
const minLg: Breakpoints["minLg"] = "@media (min-width: 1080px)";
const minXl: Breakpoints["minXl"] = "@media (min-width: 2000px)";

const styles = stylex.create({
  container: {
    maxWidth: { default: "1080px", [minXl]: "calc((1080 / 24) * 1rem)" },
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingRight: {
      default: "calc(1rem + env(safe-area-inset-right))",
      [sm]: "calc(1.2rem + env(safe-area-inset-right))",
      [md]: "calc(1.4rem + env(safe-area-inset-right))",
      [minLg]: "calc(1.7rem + env(safe-area-inset-right))",
    },
    paddingLeft: {
      default: "calc(1rem + env(safe-area-inset-left))",
      [sm]: "calc(1.2rem + env(safe-area-inset-left))",
      [md]: "calc(1.4rem + env(safe-area-inset-left))",
      [minLg]: "calc(1.7rem + env(safe-area-inset-left))",
    },
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
    display: { default: "none", [minSm]: "block" },
    left: { default: null, [sm]: "50%", [md]: "33.3%", [minLg]: "25%" },
  },
  line3: {
    display: { default: "none", [minMd]: "block" },
    left: { default: null, [md]: "66.6%", [minLg]: "50%" },
  },
  line4: {
    display: { default: "none", [minLg]: "block" },
    left: { default: null, [minLg]: "75%" },
  },
  line5: {
    display: "block",
    left: "100%",
  },
  main: {
    paddingTop: { default: "6rem", [sm]: "9rem", [minMd]: "11rem" },
  },
  flowGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: {
      default: "30rem",
      [sm]: "30rem",
      [md]: "35rem",
      [lg]: "30rem",
      [minXl]: "max(35rem, 80dvh)",
    },
  },
  maskContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    clipPath: "inset(0 0 calc((100%-10rem) / 2) 0)",
    pointerEvents: "none",
    height: {
      default: "calc(540px + 10rem)",
      [minXl]: "calc(1000px + 10rem)",
    },
  },
  mask: {
    position: "absolute",
    top: "10rem",
    left: "50%",
    transform: "translate3d(-50%,0,0)",
    borderRadius: "50%",
    background: tokens.backgroundMain,
    opacity: tokens.maskOpacity,
    mixBlendMode: tokens.maskBlendMode,
    filter: "blur(5rem)",
    width: {
      default: "1080px",
      [minXl]: "2000px",
    },
    height: {
      default: "1080px",
      [minXl]: "2000px",
    },
  },
  glowContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    overflow: "hidden",
    pointerEvents: "none",
    height: {
      default: "calc(50vw + 10rem)",
      [md]: "calc(30vw + 10rem)",
      [lg]: "calc(20vw + 10rem)",
      [minXl]: "calc(400px + 10rem)",
    },
  },
  glow: {
    position: "absolute",
    top: "10rem",
    left: "50%",
    transform: "translate3d(-50%,0,0)",
    borderRadius: "50%",
    background: tokens.controlActive,
    opacity: tokens.glowOpacity,
    filter: "blur(5rem)",
    width: "1500px",
    height: "1500px",
  },
});
