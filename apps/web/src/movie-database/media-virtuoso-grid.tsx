"use client";

import type { UseSuspenseInfiniteQueryResult } from "@tanstack/react-query";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { useSplitViewColumn } from "@tuja/ui/components/navigation-split-view";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "./grid.tsx";
import { MediaCard } from "./media-card";
import type { MediaListItem } from "./types.ts";
import { useViewportHeight } from "./use-viewport-height";

interface MediaVirtuosoGridProps {
  queryResult: UseSuspenseInfiniteQueryResult<MediaListItem[]>;
  virtuosoKey: string;
  /**
   * Row count to render on the first pass, for hydration. Owned by the caller
   * so it survives this component being unmounted by the view toggle — see the
   * note at its declaration in `MediaList`.
   */
  initialItemCount: number;
  notFoundLabel: string;
}

export function MediaVirtuosoGrid({
  queryResult,
  virtuosoKey,
  initialItemCount,
  notFoundLabel,
}: MediaVirtuosoGridProps) {
  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queryResult;
  const height = useViewportHeight();
  // The column of the screen scrolls the grid, and on a phone the page does.
  const scroller = useSplitViewColumn()?.scroller ?? null;

  if (!items.length) {
    return <EmptyState icon="🙉" title={notFoundLabel} />;
  }

  return (
    <VirtuosoGrid
      key={`${virtuosoKey}-${scroller === null ? "page" : "column"}`}
      data={items}
      components={gridComponents}
      itemContent={(index) => (
        <MediaCard media={items[index]} allowFollow={index < 20} />
      )}
      endReached={() => {
        // Guard on `isFetchingNextPage`, not `isFetching`. Virtuoso fires
        // `endReached` once per end index and will not re-fire until the index
        // grows (i.e. until more data loads). `isFetching` is true during *any*
        // fetch — including the background refetch when `staleTime` lapses — so
        // if that one `endReached` coincided with such a refetch, the load-more
        // was dropped and never retried, permanently wedging pagination.
        // `isFetchingNextPage` only blocks while a load-more is already running.
        if (hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      }}
      increaseViewportBy={height}
      initialItemCount={Math.min(initialItemCount, items.length)}
      {...(scroller === null
        ? { useWindowScroll: true }
        : { customScrollParent: scroller })}
    />
  );
}

const gridComponents = {
  List: Grid,
};
