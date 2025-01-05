import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Suspense } from "react";
import { BASE_URL } from "@/app/constants";
import { getTranslations } from "@/app/translations/getTranslations";
import { breakpoints } from "@/breakpoints";
import { BackgroundLines } from "@/server-components/background-lines";
import { FlowGradient } from "@/server-components/flow-gradient";
import { Footer } from "@/server-components/footer";
import { color, size } from "@/tokens.stylex";
import type { LayoutProps, PageProps } from "@/types";
import { glowTokens } from "./layout.stylex";
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
    alternates: {
      canonical: new URL("/", BASE_URL).toString(),
      languages: {
        en: new URL("/", BASE_URL).toString(),
        zh: new URL("/zh", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { locale } = await params;
  return (
    <>
      <div css={styles.flowGradient} role="presentation">
        <Suspense fallback={<></>}>
          <FlowGradient />
        </Suspense>
      </div>
      <div css={styles.glow} role="presentation" />
      <div css={styles.container}>
        <div css={styles.wrapperInner}>
          <BackgroundLines />
          <main css={styles.main}>{children}</main>
          <Footer locale={locale} />
        </div>
      </div>
    </>
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
    paddingLeft: `calc(${size._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${size._3} + env(safe-area-inset-right))`,
  },
  wrapperInner: {
    position: "relative",
  },
  main: {
    paddingTop: {
      default: size._11,
      [breakpoints.sm]: size._12,
    },
  },
  flowGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 0,
    height: {
      default: size._15,
      [breakpoints.md]: size._16,
      [breakpoints.lg]: size._15,
      [breakpoints.xl]: `max(${size._15}, 80dvh)`,
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
    background: `radial-gradient(circle calc(${glowTokens.height}*5) at center calc(${glowTokens.height}*5), ${color.controlActive} calc(${glowTokens.height}*4), transparent)`,
    opacity: color.opacityActive,
    height: glowTokens.height,
  },
});
