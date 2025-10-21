"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "@/components/movie-database/grid";
import type { SupportedLocale } from "@/types";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { Skeleton } from "../shared/skeleton";
import { MediaCard } from "./media-card";

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

  const {
    data: media,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(queryOptions);

  // Get viewport height, used for infinite scroll padding
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  useLayoutEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!media.length) {
    return (
      <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] my-0 mx-auto pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] text-gray-11 dark:text-grayDark-11 text-center">
        🙉 {notFoundLabel}
      </div>
    );
  }

  return (
    <VirtuosoGrid
      key={`${mediaType}-${mediaId}-${locale}`}
      data={media}
      components={gridComponents}
      itemContent={(index) =>
        media[index] ? (
          <MediaCard media={media[index]} />
        ) : (
          <Skeleton
            className="aspect-[2/3] w-full overflow-hidden"
            delay={index * 100}
          />
        )
      }
      endReached={() => {
        if (hasNextPage && !isFetching) {
          void fetchNextPage();
        }
      }}
      increaseViewportBy={height}
      initialItemCount={media.length}
      useWindowScroll
    />
  );
}

const gridComponents = {
  List: Grid,
};
