"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue, useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "@/components/movie-database/grid";
import { useMediaFilters } from "@/hooks/use-media-filters";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { useTranslationContext } from "@/utils/translation-context";
import type { MediaListItem } from "@/utils/types";
import { Skeleton } from "../shared/skeleton";
import { MediaCard } from "./media-card";

interface MediaListProps {
  initialPage: number;
  notFoundLabel: string;
}

export function MediaList({ initialPage, notFoundLabel }: MediaListProps) {
  const { locale } = useTranslationContext();
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

  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(tmdbQueryOptions);

  // Get viewport height, used for infinite scroll padding
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0,
  );
  useLayoutEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const [initialCount] = useState(items.length);

  if (!items.length) {
    return (
      <div className="max-w-[1080px] xl:max-w-[calc((1080/24)*1rem)] my-0 mx-auto pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] text-gray-11 dark:text-grayDark-11 text-center">
        🙉 {notFoundLabel}
      </div>
    );
  }

  return (
    <VirtuosoGrid
      key={JSON.stringify(tmdbQueryOptions)}
      data={items}
      components={gridComponents}
      itemContent={(index) => <ItemContent index={index} items={items} />}
      endReached={() => {
        if (hasNextPage && !isFetching) {
          void fetchNextPage();
        }
      }}
      increaseViewportBy={height}
      initialItemCount={initialCount}
      useWindowScroll
    />
  );
}

function ItemContent({
  index,
  items,
}: {
  index: number;
  items: MediaListItem[];
}) {
  const item = items[index];

  if (!item) {
    return (
      <Skeleton
        className="aspect-[2/3] w-full overflow-hidden"
        delay={index * 100}
      />
    );
  }

  const allowFollow = index < 20;

  return <MediaCard media={item} allowFollow={allowFollow} />;
}

const gridComponents = {
  List: Grid,
};
