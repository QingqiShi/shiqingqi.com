import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Suspense } from "react";
import { breakpoints } from "@/breakpoints";
import { BackgroundLines } from "@/components/home/background-lines";
import { Footer } from "@/components/home/footer";
import { FlowGradient } from "@/components/shared/flow-gradient";
import { BASE_URL } from "@/constants";
import { color, layer, space } from "@/tokens.stylex";
import type { LayoutProps, PageProps } from "@/types";
import { getTranslations } from "@/utils/get-translations";
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

export function generateStaticParams() {
  return [{ lang: "en" }, { lang: "zh" }];
}

export default function Layout({ children }: LayoutProps) {
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
          <Footer />
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
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  wrapperInner: {
    position: "relative",
  },
  main: {
    paddingTop: {
      default: space._11,
      [breakpoints.sm]: space._12,
    },
  },
  flowGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: layer.base,
    height: {
      default: space._15,
      [breakpoints.md]: space._16,
      [breakpoints.lg]: space._15,
      [breakpoints.xl]: `max(${space._15}, 80dvh)`,
    },
  },
  glow: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: layer.base,
    overflow: "hidden",
    pointerEvents: "none",
    background: `radial-gradient(circle calc(${glowTokens.height}*5) at center calc(${glowTokens.height}*5), ${color.controlActive} calc(${glowTokens.height}*4), transparent)`,
    opacity: color.opacityActive,
    height: glowTokens.height,
  },
});
