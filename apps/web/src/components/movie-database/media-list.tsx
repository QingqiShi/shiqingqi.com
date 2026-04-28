"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { useMediaFilters } from "#src/hooks/use-media-filters.ts";
import { t } from "#src/i18n.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { MediaVirtuosoGrid } from "./media-virtuoso-grid";

interface MediaListProps {
  initialPage: number;
}

export function MediaList({ initialPage }: MediaListProps) {
  const locale = useLocale();
  const { genres, genreFilterType, sort, mediaType } = useMediaFilters();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(genres);
  const deferredGenreFilterType = useDeferredValue(genreFilterType);
  const deferredSort = useDeferredValue(sort);
  const deferredMediaType = useDeferredValue(mediaType);

  const tmdbQueryOptions = tmdbQueries.mediaList({
    type: deferredMediaType,
    page: initialPage,
    language: locale,
    with_genres:
      [...deferredGenre].join(deferredGenreFilterType === "any" ? "|" : ",") ||
      undefined,
    sort_by: deferredSort !== "popularity.desc" ? deferredSort : undefined,
  });

  const queryResult = useSuspenseInfiniteQuery(tmdbQueryOptions);

  const notFoundLabel =
    deferredMediaType === "tv"
      ? t({
          en: "No TV shows found that match the criteria, please update the filters",
          zh: "没有找到符合条件的电视剧，请更新筛选条件",
        })
      : t({
          en: "No movies found that match the criteria, please update the filters",
          zh: "没有找到符合条件的电影，请更新筛选条件",
        });

  return (
    <MediaVirtuosoGrid
      queryResult={queryResult}
      virtuosoKey={JSON.stringify(tmdbQueryOptions.queryKey)}
      notFoundLabel={notFoundLabel}
    />
  );
}
