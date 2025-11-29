import * as stylex from "@stylexjs/stylex";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  getConfiguration,
  getMovieDetails,
  getMovieVideos,
  getTvShowDetails,
  getTvShowVideos,
} from "#src/_generated/tmdb-server-functions.ts";
import { breakpoints } from "#src/breakpoints.stylex.ts";
import { BackdropImage } from "#src/components/movie-database/backdrop-image.tsx";
import { SimilarMedia } from "#src/components/movie-database/similar-media.tsx";
import { Trailer } from "#src/components/movie-database/trailer.tsx";
import { TvShowTrailer } from "#src/components/movie-database/tv-show-trailer.tsx";
import { skeletonTokens } from "#src/components/shared/skeleton.stylex.ts";
import { Skeleton } from "#src/components/shared/skeleton.tsx";
import { border, color, controlSize, font, space } from "#src/tokens.stylex.ts";
import { getTranslations } from "#src/utils/get-translations.ts";
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
        <div css={styles.container}>
          {movie.backdrop_path && (
            <BackdropImage
              backdropPath={movie.backdrop_path}
              alt={movie.title ?? movie.original_title ?? t("titleFallback")}
              locale={locale}
            />
          )}
          <div css={styles.hero}>
            <div css={styles.ratingContainer}>
              <div css={styles.rating}>
                {formatter.format(movie.vote_average)}
              </div>
              <div css={styles.count}>{movie.vote_count}</div>
            </div>
            <h1 css={styles.h1}>
              {movie.title ?? movie.original_title ?? t("titleFallback")}
            </h1>
            <div css={styles.meta}>
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
              <p css={styles.description}>{movie.overview ?? movie.tagline}</p>
            )}
            <Suspense
              fallback={
                <Skeleton css={styles.trailerButtonSkeleton} width={120} />
              }
            >
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
        <div css={styles.container}>
          {tvShow.backdrop_path && (
            <BackdropImage
              backdropPath={tvShow.backdrop_path}
              alt={tvShow.name ?? tvShow.original_name ?? t("titleFallback")}
              locale={locale}
            />
          )}
          <div css={styles.hero}>
            <div css={styles.ratingContainer}>
              <div css={styles.rating}>
                {formatter.format(tvShow.vote_average)}
              </div>
              <div css={styles.count}>{tvShow.vote_count}</div>
            </div>
            <h1 css={styles.h1}>
              {tvShow.name ?? tvShow.original_name ?? t("titleFallback")}
            </h1>
            <div css={styles.meta}>
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
              <p css={styles.description}>
                {tvShow.overview ?? tvShow.tagline}
              </p>
            )}
            <Suspense
              fallback={
                <Skeleton css={styles.trailerButtonSkeleton} width={120} />
              }
            >
              <TvShowTrailer tvShowId={id} locale={locale} />
            </Suspense>
          </div>
        </div>
        <SimilarMedia mediaId={id} mediaType="tv" locale={locale} />
      </>
    );
  }
}

const styles = stylex.create({
  container: {
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    marginBottom: space._10,
    paddingBlock: 0,
    paddingLeft: `env(safe-area-inset-left)`,
    paddingRight: `env(safe-area-inset-right)`,
  },
  hero: {
    paddingTop: {
      default: space._12,
      [breakpoints.md]: `clamp(${space._10}, 20dvw, 30dvh)`,
      [breakpoints.xl]: `min(${space._13}, 30dvh)`,
    },
    paddingInline: space._3,
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
    gap: space._3,
  },
  h1: {
    fontSize: font.vpHeading1,
    margin: 0,
  },
  meta: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
    margin: 0,
  },
  description: {
    fontSize: font.uiBody,
    margin: 0,
  },
  ratingContainer: {
    width: space._10,
    height: space._10,
    borderRadius: border.radius_round,
    backgroundColor: color.backgroundRaised,
    borderWidth: space._0,
    borderColor: color.textMuted,
    borderStyle: "solid",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
  },
  rating: {
    fontSize: font.uiHeading1,
    fontWeight: font.weight_8,
  },
  count: {
    fontSize: font.uiBodySmall,
    color: color.textMuted,
  },
  trailerButtonSkeleton: {
    [skeletonTokens.height]: controlSize._9,
  },
});
