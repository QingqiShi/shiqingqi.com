"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "#src/components/movie-database/grid.tsx";
import { useViewportHeight } from "#src/hooks/use-viewport-height.ts";
import { color, ratio, space } from "#src/tokens.stylex.ts";
import type { SupportedLocale } from "#src/types.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
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

  // Viewport height used for infinite scroll pre-fetch padding
  const height = useViewportHeight();

  if (!media.length) {
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
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
          <Skeleton css={styles.skeleton} delay={index * 100} />
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
});
