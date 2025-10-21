import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  getMovieDetails,
  getTvShowDetails,
} from "@/_generated/tmdb-server-functions";
import { Footer } from "@/components/home/footer";
import posterImageTranslations from "@/components/movie-database/poster-image.translations.json";
import cardTranslations from "@/components/shared/card.translations.json";
import { TranslationProvider } from "@/components/shared/translation-provider";
import { BASE_URL } from "@/constants";
import type { SupportedLocale } from "@/types";
import { getTranslations } from "@/utils/get-translations";
import { validateLocale } from "@/utils/validate-locale";
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
      <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] mx-auto py-0 ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]">
        <div className="px-3">
          <Footer locale={validatedLocale} />
        </div>
      </div>
    </TranslationProvider>
  );
}
