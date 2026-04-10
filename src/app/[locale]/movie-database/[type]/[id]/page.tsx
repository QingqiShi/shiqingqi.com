import { notFound } from "next/navigation";
import {
  getConfiguration,
  getMovieDetails,
  getMovieVideos,
  getTvShowDetails,
  getTvShowVideos,
} from "#src/_generated/tmdb-server-functions.ts";
import { MediaDetailHero } from "#src/components/movie-database/media-detail-hero.tsx";
import { SimilarMedia } from "#src/components/movie-database/similar-media.tsx";
import { Trailer } from "#src/components/movie-database/trailer.tsx";
import { t } from "#src/i18n.ts";
import { formatRuntime } from "#src/utils/format-runtime.ts";
import type { PageProps } from "./types";

export default async function Page({ params }: PageProps) {
  const { type, id, locale } = await params;

  // Validate type
  if (type !== "movie" && type !== "tv") {
    notFound();
  }

  // Pre-fetch configuration
  void getConfiguration();

  if (type === "movie") {
    // Start the most important fetch before pre-fetch requests
    const movieDetailsPromise = getMovieDetails({
      movie_id: id,
      language: locale,
    });

    // Pre-fetch (hardcode to English — trailers are often only available in English)
    void getMovieVideos({ movie_id: id, language: "en" });

    const movie = await movieDetailsPromise;

    const title =
      movie.title ?? movie.original_title ?? t({ en: "Untitled", zh: "佚名" });

    const meta = [
      movie.release_date?.split("-")[0],
      formatRuntime(movie.runtime, locale),
      movie.genres
        ?.map((genre) => genre.name)
        .filter(Boolean)
        .join(t({ en: ", ", zh: "、" })),
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <>
        <MediaDetailHero
          title={title}
          backdropPath={movie.backdrop_path}
          voteAverage={movie.vote_average}
          voteCount={movie.vote_count}
          meta={meta}
          description={movie.overview ?? movie.tagline}
          locale={locale}
          trailer={<Trailer mediaType="movie" id={id} locale={locale} />}
        />
        <SimilarMedia mediaId={id} mediaType="movie" locale={locale} />
      </>
    );
  } else {
    // TV Show
    const tvShowDetailsPromise = getTvShowDetails({
      series_id: id,
      language: locale,
    });

    // Pre-fetch (hardcode to English — trailers are often only available in English)
    void getTvShowVideos({ series_id: id, language: "en" });

    const tvShow = await tvShowDetailsPromise;

    const title =
      tvShow.name ?? tvShow.original_name ?? t({ en: "Untitled", zh: "佚名" });

    const pluralRules = new Intl.PluralRules(locale);
    const seasonLabel =
      pluralRules.select(tvShow.number_of_seasons) === "one"
        ? t({ en: "season", zh: "季" })
        : t({ en: "seasons", zh: "季" });
    const episodeLabel =
      pluralRules.select(tvShow.number_of_episodes) === "one"
        ? t({ en: "episode", zh: "集" })
        : t({ en: "episodes", zh: "集" });

    const meta = [
      tvShow.first_air_date?.split("-")[0],
      `${tvShow.number_of_seasons} ${seasonLabel} • ${tvShow.number_of_episodes} ${episodeLabel}`,
      tvShow.genres
        ?.map((genre) => genre.name)
        .filter(Boolean)
        .join(t({ en: ", ", zh: "、" })),
    ]
      .filter(Boolean)
      .join(" • ");

    return (
      <>
        <MediaDetailHero
          title={title}
          backdropPath={tvShow.backdrop_path}
          voteAverage={tvShow.vote_average}
          voteCount={tvShow.vote_count}
          meta={meta}
          description={tvShow.overview ?? tvShow.tagline}
          locale={locale}
          trailer={<Trailer mediaType="tv" id={id} locale={locale} />}
        />
        <SimilarMedia mediaId={id} mediaType="tv" locale={locale} />
      </>
    );
  }
}
