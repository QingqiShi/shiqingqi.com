import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { ErrorBoundary } from "react-error-boundary";
import { BASE_URL } from "#src/constants.ts";
import { color, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import translations from "./translations.json";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  const { t } = getTranslations(translations, validatedLocale);

  return {
    title: t("title"),
    description: t("description"),
    alternates: {
      canonical: new URL("/movie-database/ai-mode", BASE_URL).toString(),
      languages: {
        en: new URL("/movie-database/ai-mode", BASE_URL).toString(),
        zh: new URL("/zh/movie-database/ai-mode", BASE_URL).toString(),
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
  const { t } = getTranslations(translations, validatedLocale);

  return (
    <ErrorBoundary
      fallback={
        <div css={styles.errorContainer}>
          <p css={styles.errorText}>{t("errorMessage")}</p>
        </div>
      }
    >
      <main css={styles.container}>{children}</main>
    </ErrorBoundary>
  );
}

const styles = stylex.create({
  container: {
    display: "flex",
    flexDirection: "column",
    minHeight: `calc(100dvh - ${space._10} - env(safe-area-inset-top))`,
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingBlock: 0,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  errorContainer: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "60vh",
    padding: space._6,
  },
  errorText: {
    fontSize: "18px",
    color: color.textMuted,
    margin: 0,
  },
});
