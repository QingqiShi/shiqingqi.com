"use client";

import * as stylex from "@stylexjs/stylex";
import type { UseSuspenseInfiniteQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { useViewportHeight } from "#src/hooks/use-viewport-height.ts";
import { t } from "#src/i18n.ts";
import { color, font, ratio, space } from "#src/tokens.stylex.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import { Skeleton } from "../shared/skeleton";
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
    isFetching,
    isFetchNextPageError,
  } = queryResult;
  const height = useViewportHeight();
  const [initialItemCount] = useState(items.length);

  if (!items.length) {
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
  }

  return (
    <>
      <VirtuosoGrid
        key={virtuosoKey}
        data={items}
        components={gridComponents}
        itemContent={(index) => {
          const item = items[index];
          if (!item) {
            return <Skeleton css={styles.skeleton} delay={index * 100} />;
          }
          return <MediaCard media={item} allowFollow={index < 20} />;
        }}
        endReached={() => {
          if (hasNextPage && !isFetching && !isFetchNextPageError) {
            void fetchNextPage();
          }
        }}
        increaseViewportBy={height}
        initialItemCount={initialItemCount}
        useWindowScroll
      />
      {isFetchNextPageError && (
        <div css={styles.errorContainer}>
          <p css={styles.errorText}>
            {t({
              en: "Failed to load more results.",
              zh: "加载更多结果失败。",
            })}
          </p>
          <button
            type="button"
            css={styles.retryButton}
            onClick={() => void fetchNextPage()}
          >
            {t({ en: "Try again", zh: "重试" })}
          </button>
        </div>
      )}
    </>
  );
}

const gridComponents = {
  List: Grid,
};

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
    overflow: "hidden",
  },
  notFound: {
    maxInlineSize: "1140px",
    marginBlock: 0,
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    color: color.textMuted,
    textAlign: "center",
  },
  errorContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._5,
    paddingInline: space._3,
  },
  errorText: {
    margin: 0,
    fontSize: font.uiBody,
    color: color.textMuted,
  },
  retryButton: {
    background: "none",
    borderWidth: 0,
    padding: `${space._1} ${space._3}`,
    font: "inherit",
    fontSize: font.uiBody,
    fontWeight: font.weight_6,
    color: color.controlActive,
    cursor: "pointer",
    textDecoration: {
      default: "none",
      ":hover": "underline",
    },
  },
});
