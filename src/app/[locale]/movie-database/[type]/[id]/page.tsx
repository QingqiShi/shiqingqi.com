import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getConfiguration,
  getMovieDetails,
  getMovieVideos,
  getTvShowDetails,
  getTvShowVideos,
} from "@/_generated/tmdb-server-functions";
import { BackdropImage } from "@/components/movie-database/backdrop-image";
import { SimilarMedia } from "@/components/movie-database/similar-media";
import { Trailer } from "@/components/movie-database/trailer";
import { TvShowTrailer } from "@/components/movie-database/tv-show-trailer";
import { Skeleton } from "@/components/shared/skeleton";
import { getTranslations } from "@/utils/get-translations";
import translations from "./translations.json";
import type { PageProps } from "./types";

export default async function Page({ params }: PageProps) {
  const { type, id, locale } = await params;
  const { t } = getTranslations(translations, locale);

  // Validate type
  if (type !== "movie" && type !== "tv") {
    notFound();
  }

  // Pre-fetch configuration
  void getConfiguration();

  const formatter = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 });

  if (type === "movie") {
    // Start the most important fetch before pre-fetch requests
    const movieDetailsPromise = getMovieDetails({
      movie_id: id,
      language: locale,
    });

    // Pre-fetch
    void getMovieVideos({ movie_id: id, language: locale });

    const movie = await movieDetailsPromise;
    const hours = Math.floor(movie.runtime / 60);
    const minutes = movie.runtime % 60;

    return (
      <>
        <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] mx-auto py-0 mb-10 ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]">
          {movie.backdrop_path && (
            <BackdropImage
              backdropPath={movie.backdrop_path}
              alt={movie.title ?? movie.original_title ?? t("titleFallback")}
              locale={locale}
            />
          )}
          <div className="pt-12 md:pt-[clamp(2.5rem,20dvw,30dvh)] xl:pt-[min(3.5rem,30dvh)] px-3 flex flex-col justify-end gap-3">
            <div className="w-9 h-9 rounded-full surface-raised border-0 border-gray-11 dark:border-grayDark-11 border-solid text-xs flex flex-col items-center justify-center">
              <div className="text-5xl font-extrabold">
                {formatter.format(movie.vote_average)}
              </div>
              <div className="text-base text-gray-11 dark:text-grayDark-11">
                {movie.vote_count}
              </div>
            </div>
            <h1 className="text-6xl m-0">
              {movie.title ?? movie.original_title ?? t("titleFallback")}
            </h1>
            <div className="text-base m-0">
              {[
                movie.release_date?.split("-")[0],
                `${hours > 0 ? `${hours}${t("hours")} ` : ""}${minutes}${t("minutes")}`,
                movie.genres
                  ?.map((genre) => genre.name)
                  .filter(Boolean)
                  .join(t("comma")),
              ]
                .filter(Boolean)
                .join(" • ")}
            </div>
            {(movie.overview || movie.tagline) && (
              <p className="text-lg m-0">{movie.overview ?? movie.tagline}</p>
            )}
            <Suspense fallback={<Skeleton className="h-[3rem]" width={120} />}>
              <Trailer movieId={id} locale={locale} />
            </Suspense>
          </div>
        </div>
        <SimilarMedia mediaId={id} mediaType="movie" locale={locale} />
      </>
    );
  } else {
    // TV Show
    const tvShowDetailsPromise = getTvShowDetails({
      series_id: id,
      language: locale,
    });

    // Pre-fetch
    void getTvShowVideos({ series_id: id, language: locale });

    const tvShow = await tvShowDetailsPromise;

    return (
      <>
        <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] mx-auto py-0 mb-10 ps-[env(safe-area-inset-left)] pe-[env(safe-area-inset-right)]">
          {tvShow.backdrop_path && (
            <BackdropImage
              backdropPath={tvShow.backdrop_path}
              alt={tvShow.name ?? tvShow.original_name ?? t("titleFallback")}
              locale={locale}
            />
          )}
          <div className="pt-12 md:pt-[clamp(2.5rem,20dvw,30dvh)] xl:pt-[min(3.5rem,30dvh)] px-3 flex flex-col justify-end gap-3">
            <div className="w-9 h-9 rounded-full surface-raised border-0 border-gray-11 dark:border-grayDark-11 border-solid text-xs flex flex-col items-center justify-center">
              <div className="text-5xl font-extrabold">
                {formatter.format(tvShow.vote_average)}
              </div>
              <div className="text-base text-gray-11 dark:text-grayDark-11">
                {tvShow.vote_count}
              </div>
            </div>
            <h1 className="text-6xl m-0">
              {tvShow.name ?? tvShow.original_name ?? t("titleFallback")}
            </h1>
            <div className="text-base m-0">
              {[
                tvShow.first_air_date?.split("-")[0],
                `${tvShow.number_of_seasons}${t("seasons")} • ${tvShow.number_of_episodes}${t("episodes")}`,
                tvShow.genres
                  ?.map((genre) => genre.name)
                  .filter(Boolean)
                  .join(t("comma")),
              ]
                .filter(Boolean)
                .join(" • ")}
            </div>
            {(tvShow.overview || tvShow.tagline) && (
              <p className="text-lg m-0">{tvShow.overview ?? tvShow.tagline}</p>
            )}
            <Suspense fallback={<Skeleton className="h-[3rem]" width={120} />}>
              <TvShowTrailer tvShowId={id} locale={locale} />
            </Suspense>
          </div>
        </div>
        <SimilarMedia mediaId={id} mediaType="tv" locale={locale} />
      </>
    );
  }
}
