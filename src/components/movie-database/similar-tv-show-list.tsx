"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { breakpoints } from "@/breakpoints";
import { Grid } from "@/components/movie-database/grid";
import { color, ratio, space } from "@/tokens.stylex";
import type { SupportedLocale } from "@/types";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { Skeleton } from "../shared/skeleton";
import { TvShowCard } from "./tv-show-card";

interface SimilarTvShowListProps {
  tvShowId: string;
  locale: SupportedLocale;
  initialPage: number;
  notFoundLabel: string;
}

export function SimilarTvShowList({
  tvShowId,
  locale,
  initialPage,
  notFoundLabel,
}: SimilarTvShowListProps) {
  const tmdbQueryOptions = tmdbQueries.similarTvShows({
    page: initialPage,
    language: locale,
    seriesId: tvShowId,
  });
  const {
    data: tvShows,
    fetchNextPage,
    hasNextPage,
    isFetching,
  } = useSuspenseInfiniteQuery(tmdbQueryOptions);

  // Get viewport height, used for infinite scroll padding
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  useLayoutEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!tvShows.length) {
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
  }

  return (
    <VirtuosoGrid
      key={JSON.stringify(tmdbQueryOptions)}
      data={tvShows}
      components={gridComponents}
      itemContent={(index) =>
        tvShows[index] ? (
          <TvShowCard tvShow={tvShows[index]} />
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
      initialItemCount={tvShows.length}
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
