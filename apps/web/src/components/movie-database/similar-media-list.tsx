"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useState } from "react";
import type { SupportedLocale } from "#src/types.ts";
import { similarMediaQuery } from "#src/utils/tmdb-queries/similar-media-query.ts";
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
