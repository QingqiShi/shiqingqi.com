import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/react";
import * as stylex from "@stylexjs/stylex";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getTranslations } from "../translations/getTranslations";
import type { Breakpoints, LayoutProps, PageProps } from "../../types";
import { Header } from "../../server-components/header";
import { globalStyles } from "../globalStyles";
import { tokens } from "../../tokens.stylex";
import { Footer } from "../../server-components/footer";
import { FlowGradient } from "../../server-components/flow-gradient";
import { themeHack } from "../../utils/theme-hack";
import translations from "./translations.json";

export async function generateMetadata({ params }: PageProps) {
  const { t } = getTranslations(translations, params.locale);
  return {
    title: {
      default: t("title"),
      template: t("titleTemplate"),
    },
    description: t("description"),
  } satisfies Metadata;
}

export default function RootLayout({ children, params }: LayoutProps) {
  if (params.locale !== "en" && params.locale !== "zh") {
    redirect("/");
  }

  return (
    <html lang={params.locale} suppressHydrationWarning>
      <head>
        <link
          rel="preload"
          href="./InterVariable.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />
      </head>
      <body {...stylex.props(globalStyles.global, globalStyles.body)}>
        <script dangerouslySetInnerHTML={{ __html: themeHack }} />
        <div {...stylex.props(styles.flowGradient)}>
          <Suspense fallback={<></>}>
            <FlowGradient />
          </Suspense>
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
            <Footer locale={params.locale} />
          </div>
        </div>
        <Analytics />
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
const minLg: Breakpoints["minLg"] = "@media (min-width: 1080px)";
const minXl: Breakpoints["minXl"] = "@media (min-width: 2000px)";

const styles = stylex.create({
  container: {
    maxWidth: { default: "1080px", [minXl]: "calc((1080 / 24) * 1rem)" },
    marginVertical: 0,
    marginHorizontal: "auto",
    paddingVertical: 0,
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
      default: "10rem",
      [sm]: "14rem",
      [md]: "17rem",
      [minLg]: "19rem",
    },
  },
});
