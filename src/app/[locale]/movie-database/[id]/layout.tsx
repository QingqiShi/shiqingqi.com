import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { breakpoints } from "@/breakpoints";
import { Footer } from "@/components/home/footer";
import { BASE_URL } from "@/constants";
import { space } from "@/tokens.stylex";
import { getTranslations } from "@/utils/get-translations";
import { fetchMovieDetails } from "@/utils/tmdb-api";
import translations from "./translations.json";
import type { LayoutProps, PageProps } from "./types";

export async function generateMetadata({ params }: PageProps) {
  const { locale, id } = await params;
  const movieDetails = await fetchMovieDetails(id, { language: locale });
  const { t } = getTranslations(translations, locale);
  return {
    title:
      movieDetails.title ??
      movieDetails.original_language ??
      t("titleFallback"),
    description: movieDetails.tagline,
    alternates: {
      canonical: new URL(`/movie-database/${id}`, BASE_URL).toString(),
      languages: {
        en: new URL(`/movie-database/${id}`, BASE_URL).toString(),
        zh: new URL(`/zh/movie-database/${id}`, BASE_URL).toString(),
      },
    },
  } satisfies Metadata;
}

export default async function Layout({ children, params }: LayoutProps) {
  const { locale } = await params;
  return (
    <div css={styles.container}>
      <main>{children}</main>
      <div css={styles.wrapperInner}>
        <Footer locale={locale} />
      </div>
    </div>
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
  wrapperInner: {},
});
