"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import type { SupportedLocale } from "#src/types.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import { MediaVirtuosoGrid } from "./media-virtuoso-grid";

interface SimilarMediaListProps {
  mediaId: string;
  mediaType: "movie" | "tv";
  locale: SupportedLocale;
  initialPage: number;
  notFoundLabel: string;
}

export function SimilarMediaList({
  mediaId,
  mediaType,
  locale,
  initialPage,
  notFoundLabel,
}: SimilarMediaListProps) {
  const queryOptions = tmdbQueries.similarMedia({
    type: mediaType,
    id: mediaId,
    page: initialPage,
    language: locale,
  });

  const queryResult = useSuspenseInfiniteQuery(queryOptions);

  return (
    <MediaVirtuosoGrid
      queryResult={queryResult}
      virtuosoKey={`${mediaType}-${mediaId}-${locale}`}
      notFoundLabel={notFoundLabel}
    />
  );
}
