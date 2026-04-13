import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { Suspense } from "react";
import {
  getConfiguration,
  getTrendingMovies,
  getTrendingTvShows,
} from "#src/_generated/tmdb-server-functions.ts";
import { t } from "#src/i18n.ts";
import type { SupportedLocale } from "#src/types.ts";
import { getQueryClient } from "#src/utils/get-query-client.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { RecommendedMediaRow } from "./recommended-media-row";
import { RecommendedMediaRowSkeleton } from "./recommended-media-row-skeleton";

const ITEMS_PER_ROW = 10;

interface RecommendedMediaProps {
  locale: SupportedLocale;
}

export function RecommendedMedia({ locale }: RecommendedMediaProps) {
  const queryClient = getQueryClient();

  void queryClient.prefetchQuery({
    ...tmdbQueries.configuration,
    queryFn: async () => getConfiguration(),
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <>
      <Suspense fallback={<RecommendedMediaRowSkeleton />}>
        <TrendingMoviesRow locale={locale} dehydratedState={dehydratedState} />
      </Suspense>
      <Suspense fallback={<RecommendedMediaRowSkeleton />}>
        <TrendingTvShowsRow locale={locale} dehydratedState={dehydratedState} />
      </Suspense>
    </>
  );
}

async function TrendingMoviesRow({
  locale,
  dehydratedState,
}: {
  locale: SupportedLocale;
  dehydratedState: ReturnType<typeof dehydrate>;
}) {
  const response = await getTrendingMovies({
    time_window: "week",
    language: locale,
  }).catch((error: unknown) => {
    console.error("Failed to fetch trending movies:", error);
    return null;
  });
  if (!response) return null;

  const items = (response.results ?? [])
    .filter((movie) => movie.title)
    .slice(0, ITEMS_PER_ROW)
    .map((movie) => ({
      id: movie.id,
      title: movie.title,
      posterPath: movie.poster_path,
      rating: movie.vote_average,
      mediaType: "movie" as const,
    }));

  return (
    <HydrationBoundary state={dehydratedState}>
      <RecommendedMediaRow
        title={t({ en: "Trending Movies", zh: "热门电影" })}
        items={items}
      />
    </HydrationBoundary>
  );
}

async function TrendingTvShowsRow({
  locale,
  dehydratedState,
}: {
  locale: SupportedLocale;
  dehydratedState: ReturnType<typeof dehydrate>;
}) {
  const response = await getTrendingTvShows({
    time_window: "week",
    language: locale,
  }).catch((error: unknown) => {
    console.error("Failed to fetch trending TV shows:", error);
    return null;
  });
  if (!response) return null;

  const items = (response.results ?? [])
    .filter((show) => show.name)
    .slice(0, ITEMS_PER_ROW)
    .map((show) => ({
      id: show.id,
      title: show.name,
      posterPath: show.poster_path,
      rating: show.vote_average,
      mediaType: "tv" as const,
    }));

  return (
    <HydrationBoundary state={dehydratedState}>
      <RecommendedMediaRow
        title={t({ en: "Trending TV Shows", zh: "热门电视剧" })}
        items={items}
      />
    </HydrationBoundary>
  );
}
