// @inferEffectDependencies
"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { breakpoints } from "@/breakpoints.stylex";
import { Grid } from "@/components/movie-database/grid";
import { color, ratio, space } from "@/tokens.stylex";
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
  });

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
    maxWidth: {
      default: "1080px",
      [breakpoints.xl]: "calc((1080 / 24) * 1rem)",
    },
    marginBlock: 0,
    marginInline: "auto",
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
    color: color.textMuted,
    textAlign: "center",
  },
});
