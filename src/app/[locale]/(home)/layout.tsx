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
import { color, layer, space } from "#src/tokens.stylex.ts";
import type { PageProps, SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import { glowTokens } from "./layout.stylex";
import translations from "./translations.json";

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const params = await props.params;
  const validatedLocale = validateLocale(params.locale);
  const { t } = getTranslations(translations, validatedLocale);
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
