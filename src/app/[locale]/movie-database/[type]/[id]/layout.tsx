import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMovieDetails,
  getTvShowDetails,
} from "#src/_generated/tmdb-server-functions.ts";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { Footer } from "#src/components/home/footer.tsx";
import posterImageTranslations from "#src/components/movie-database/poster-image.translations.json";
import cardTranslations from "#src/components/shared/card.translations.json";
import { TranslationProvider } from "#src/components/shared/translation-provider.tsx";
import { BASE_URL } from "#src/constants.ts";
import { space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
import { validateLocale } from "#src/utils/validate-locale.ts";
import translations from "./translations.json";
import type { PageProps } from "./types";

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { locale, type, id } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  const { t } = getTranslations(translations, validatedLocale);

  // Validate type
  if (type !== "movie" && type !== "tv") {
    notFound();
  }

  if (type === "movie") {
    const movieDetails = await getMovieDetails({
      movie_id: id,
      language: validatedLocale,
    });
    return {
      title:
        movieDetails.title ?? movieDetails.original_title ?? t("titleFallback"),
      description: movieDetails.tagline,
      alternates: {
        canonical: new URL(`/movie-database/movie/${id}`, BASE_URL).toString(),
        languages: {
          en: new URL(`/movie-database/movie/${id}`, BASE_URL).toString(),
          zh: new URL(`/zh/movie-database/movie/${id}`, BASE_URL).toString(),
        },
      },
    } satisfies Metadata;
  } else {
    const tvShowDetails = await getTvShowDetails({
      series_id: id,
      language: validatedLocale,
    });
    return {
      title:
        tvShowDetails.name ?? tvShowDetails.original_name ?? t("titleFallback"),
      description: tvShowDetails.tagline,
      alternates: {
        canonical: new URL(`/movie-database/tv/${id}`, BASE_URL).toString(),
        languages: {
          en: new URL(`/movie-database/tv/${id}`, BASE_URL).toString(),
          zh: new URL(`/zh/movie-database/tv/${id}`, BASE_URL).toString(),
        },
      },
    } satisfies Metadata;
  }
}

export default async function Layout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string; type: string; id: string }>;
}) {
  const { locale } = await params;
  const validatedLocale: SupportedLocale = validateLocale(locale);
  return (
    <TranslationProvider
      locale={validatedLocale}
      translations={{
        card: cardTranslations,
        posterImage: posterImageTranslations,
      }}
    >
      <main>{children}</main>
      <div css={styles.container}>
        <div css={styles.wrapperInner}>
          <Footer locale={validatedLocale} />
        </div>
      </div>
    </TranslationProvider>
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
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  wrapperInner: {
    paddingInline: space._3,
  },
});
