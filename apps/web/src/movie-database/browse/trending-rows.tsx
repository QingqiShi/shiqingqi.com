import * as stylex from "@stylexjs/stylex";
import { HydrationBoundary } from "@tanstack/react-query";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { stack } from "@tuja/ui/primitives/stack.stylex";
import { space } from "@tuja/ui/tokens.stylex";
import { Suspense } from "react";
import {
  getTrendingMovies,
  getTrendingTvShows,
} from "#src/_generated/tmdb-server-functions.ts";
import { getLocalePath } from "#src/i18n/get-locale-path.ts";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { t } from "#src/i18n.ts";
import { getConfigurationDehydratedState } from "#src/movie-database/tmdb/get-configuration-dehydrated-state.ts";
import type { MediaType } from "#src/movie-database/types.ts";
import { MediaRowSkeleton } from "./media-row-skeleton.tsx";
import {
  MediaRow,
  type MediaRowInset,
  type MediaRowItem,
} from "./media-row.tsx";

interface RowOptions {
  locale: SupportedLocale;
  limit: number;
  inset: MediaRowInset;
  /** Link each card to its Details page instead of showing its Rating. */
  linkToDetails?: boolean;
}

interface TrendingRowsProps extends RowOptions {
  movieTitle: string;
  tvShowTitle: string;
}

export function TrendingRows({
  movieTitle,
  tvShowTitle,
  ...options
}: TrendingRowsProps) {
  // The page's own HydrationBoundary is a later sibling, so it can hydrate
  // the shared client-side cache after these rows render during SSR. This
  // subtree must carry its own dehydrated configuration prefetch, or
  // PosterImage's useSuspenseQuery runs its client queryFn on the server.
  return (
    <HydrationBoundary state={getConfigurationDehydratedState()}>
      <section
        aria-label={t({ en: "Trending this week", zh: "本周热门" })}
        css={[stack.group, options.inset === "standalone" && styles.page]}
      >
        <Suspense fallback={<MediaRowSkeleton inset={options.inset} />}>
          <TrendingRow mediaType="movie" title={movieTitle} {...options} />
        </Suspense>
        <Suspense fallback={<MediaRowSkeleton inset={options.inset} />}>
          <TrendingRow mediaType="tv" title={tvShowTitle} {...options} />
        </Suspense>
      </section>
    </HydrationBoundary>
  );
}

interface TrendingMedia {
  id: number;
  title?: string;
  posterPath?: string | null;
  rating?: number;
}

async function TrendingRow({
  mediaType,
  title,
  locale,
  limit,
  inset,
  linkToDetails = false,
}: RowOptions & { mediaType: MediaType; title: string }) {
  const trending = await fetchTrending(mediaType, locale).catch(
    (error: unknown) => {
      console.error(
        `Failed to fetch trending ${mediaType === "tv" ? "TV shows" : "movies"}:`,
        error,
      );
      return null;
    },
  );
  if (!trending) return null;

  const items = trending
    .filter((media) => media.title)
    .slice(0, limit)
    .map(({ id, title, posterPath, rating }): MediaRowItem => ({
      id,
      title,
      posterPath,
      mediaType,
      ...(linkToDetails
        ? {
            href: getLocalePath(
              `/movie-database/${mediaType}/${id.toString()}`,
              locale,
            ),
          }
        : { rating }),
    }));

  return <MediaRow title={title} items={items} inset={inset} />;
}

async function fetchTrending(
  mediaType: MediaType,
  locale: SupportedLocale,
): Promise<TrendingMedia[]> {
  const params = { time_window: "week", language: locale };
  if (mediaType === "tv") {
    const response = await getTrendingTvShows(params);
    return (response.results ?? []).map((show) => ({
      id: show.id,
      title: show.name,
      posterPath: show.poster_path,
      rating: show.vote_average,
    }));
  }
  const response = await getTrendingMovies(params);
  return (response.results ?? []).map((movie) => ({
    id: movie.id,
    title: movie.title,
    posterPath: movie.poster_path,
    rating: movie.vote_average,
  }));
}

const styles = stylex.create({
  page: {
    paddingBlockEnd: { default: space._5, [breakpoints.md]: space._6 },
  },
});
