import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { BackgroundLines } from "#src/components/home/background-lines.tsx";
import { Footer } from "#src/components/home/footer.tsx";
import { FlowGradient } from "#src/components/shared/flow-gradient/flow-gradient.tsx";
import { BASE_URL } from "#src/constants.ts";
import { i18nConfig } from "#src/i18n-config.ts";
import { t } from "#src/i18n.ts";
import { color, layer, space } from "#src/tokens.stylex.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { glowTokens } from "./layout.stylex";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  validateLocale(params.locale);
  return {
    title: {
      default: t({ en: "Qingqi Shi", zh: "石清琪" }),
      template: t({ en: "%s | Qingqi Shi", zh: "%s | 石清琪" }),
    },
    description: t({
      en: "Explore the personal website of Qingqi Shi, a software engineer who values the craftsman's spirit and specializes in React, TypeScript, and web development. Discover his professional experiences, technical skills, and educational background.",
      zh: "探索石清琪的个人网站，他是一位信奉匠人精神并擅长 React、TypeScript 和 Web 开发的软件工程师。了解他的职业经历、技术技能和教育背景。",
    }),
    applicationName: t({ en: "Qingqi Shi", zh: "石清琪" }),
    alternates: {
      canonical: new URL("/", BASE_URL).toString(),
      languages: {
        en: new URL("/", BASE_URL).toString(),
        zh: new URL("/zh", BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);

  if (!i18nConfig.locales.includes(validatedLocale)) {
    notFound();
  }

  return (
    <>
      <div css={styles.flowGradient} role="presentation">
        <Suspense fallback={null}>
          <ErrorBoundary fallback={null}>
            <FlowGradient />
          </ErrorBoundary>
        </Suspense>
      </div>
      <div css={styles.glow} role="presentation" />
      <div css={styles.container}>
        <div css={styles.wrapperInner}>
          <BackgroundLines />
          <main css={styles.main}>{children}</main>
          <Footer locale={validatedLocale} />
        </div>
      </div>
    </>
  );
}

const styles = stylex.create({
  container: {
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  wrapperInner: {
    position: "relative",
  },
  main: {},
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
    backgroundImage: `radial-gradient(circle calc(${glowTokens.height}*5) at center calc(${glowTokens.height}*5), ${color.controlActive} calc(${glowTokens.height}*4), transparent)`,
    opacity: color.opacityActive,
    height: glowTokens.height,
  },
});
