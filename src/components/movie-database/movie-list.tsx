"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useDeferredValue, useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { breakpoints } from "@/breakpoints";
import { Grid } from "@/components/movie-database/grid";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { color, ratio, space } from "@/tokens.stylex";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { useTranslationContext } from "@/utils/translation-context";
import { Skeleton } from "../shared/skeleton";
import { MovieCard } from "./movie-card";

interface MovieListProps {
  initialPage: number;
  notFoundLabel: string;
}

export function MovieList({ initialPage, notFoundLabel }: MovieListProps) {
  const { locale } = useTranslationContext();

  const { genres, genreFilterType } = useMovieFilters();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(genres);
  const deferredGenreFilterType = useDeferredValue(genreFilterType);

  const {
    data: { movies },
    fetchNextPage,
    hasNextPage,
  } = useSuspenseInfiniteQuery(
    tmdbQueries.movieList({
      page: initialPage,
      language: locale,
      with_genres:
        [...deferredGenre].join(
          deferredGenreFilterType === "any" ? "|" : ","
        ) || undefined,
    })
  );

  // Get viewport height, used for infinite scroll padding
  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  useLayoutEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  if (!movies.length) {
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
  }

  return (
    <VirtuosoGrid
      data={movies}
      components={gridComponents}
      itemContent={(index) =>
        movies[index] ? (
          <MovieCard movie={movies[index]} />
        ) : (
          <Skeleton css={styles.skeleton} delay={index * 100} />
        )
      }
      endReached={hasNextPage ? () => void fetchNextPage() : undefined}
      increaseViewportBy={height}
      initialItemCount={movies.length}
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
