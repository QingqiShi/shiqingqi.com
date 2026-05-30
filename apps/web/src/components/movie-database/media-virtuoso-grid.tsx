"use client";

import * as stylex from "@stylexjs/stylex";
import type { UseSuspenseInfiniteQueryResult } from "@tanstack/react-query";
import { color, layout, space } from "@tuja/ui/tokens.stylex";
import { useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { useViewportHeight } from "#src/hooks/use-viewport-height.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { MediaCard } from "./media-card";

interface MediaVirtuosoGridProps {
  queryResult: UseSuspenseInfiniteQueryResult<MediaListItem[]>;
  virtuosoKey: string;
  notFoundLabel: string;
}

export function MediaVirtuosoGrid({
  queryResult,
  virtuosoKey,
  notFoundLabel,
}: MediaVirtuosoGridProps) {
  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queryResult;
  const height = useViewportHeight();
  const [storedInitialItemCount] = useState(items.length);
  const initialItemCount = Math.min(storedInitialItemCount, items.length);

  if (!items.length) {
    return (
      <div css={styles.notFound}>
        <span aria-hidden="true">🙉 </span>
        {notFoundLabel}
      </div>
    );
  }

  return (
    <VirtuosoGrid
      key={virtuosoKey}
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
      initialItemCount={initialItemCount}
      useWindowScroll
    />
  );
}

const gridComponents = {
  List: Grid,
};

const styles = stylex.create({
  notFound: {
    maxInlineSize: layout.maxInlineSize,
    marginBlock: 0,
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    color: color.textMuted,
    textAlign: "center",
  },
});
