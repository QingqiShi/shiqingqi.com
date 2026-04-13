"use client";

import * as stylex from "@stylexjs/stylex";
import type { UseSuspenseInfiniteQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { useViewportHeight } from "#src/hooks/use-viewport-height.ts";
import { color, layout, space } from "#src/tokens.stylex.ts";
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
  const { data: items, fetchNextPage, hasNextPage, isFetching } = queryResult;
  const height = useViewportHeight();
  const [initialItemCount] = useState(items.length);

  if (!items.length) {
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
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
        if (hasNextPage && !isFetching) {
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
