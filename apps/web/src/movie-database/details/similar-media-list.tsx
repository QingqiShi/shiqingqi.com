"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { SupportedLocale } from "#src/i18n/types.ts";
import { MediaVirtuosoGrid } from "#src/movie-database/media-virtuoso-grid.tsx";
import { similarMediaQuery } from "#src/movie-database/tmdb/queries/similar-media-query.ts";

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
  const queryOptions = similarMediaQuery({
    type: mediaType,
    id: mediaId,
    page: initialPage,
    language: locale,
  });

  const queryResult = useSuspenseInfiniteQuery(queryOptions);

  // The server-rendered row count, for hydration.
  const [initialItemCount] = useState(() => queryResult.data.length);

  return (
    <MediaVirtuosoGrid
      queryResult={queryResult}
      virtuosoKey={`${mediaType}-${mediaId}-${locale}`}
      initialItemCount={initialItemCount}
      notFoundLabel={notFoundLabel}
    />
  );
}
