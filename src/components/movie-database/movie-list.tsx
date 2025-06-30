"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { memo, useDeferredValue, useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { breakpoints } from "@/breakpoints";
import { Grid } from "@/components/movie-database/grid";
import { useMovieFilters } from "@/hooks/use-movie-filters";
import { color, ratio, space } from "@/tokens.stylex";
import type { MovieListItem } from "@/utils/tmdb-api";
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

  const { genres, genreFilterType, sort } = useMovieFilters();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(genres);
  const deferredGenreFilterType = useDeferredValue(genreFilterType);
  const deferredSort = useDeferredValue(sort);

  const tmdbQueryOptions = tmdbQueries.movieList({
    page: initialPage,
    language: locale,
    with_genres:
      [...deferredGenre].join(deferredGenreFilterType === "any" ? "|" : ",") ||
      undefined,
    sort_by: deferredSort !== "popularity.desc" ? deferredSort : undefined,
  });
  const {
    data: { movies },
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

  const [initialCount] = useState(movies.length);

  if (!movies.length) {
    return <div css={styles.notFound}>🙉 {notFoundLabel}</div>;
  }

  return (
    <VirtuosoGrid
      key={JSON.stringify(tmdbQueryOptions)}
      data={movies}
      components={gridComponents}
      itemContent={(index) => <ItemContent index={index} movies={movies} />}
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

const ItemContent = memo(function ItemContent({
  index,
  movies,
}: {
  index: number;
  movies: MovieListItem[];
}) {
  return movies[index] ? (
    <MovieCard movie={movies[index]} allowFollow={index < 20} />
  ) : (
    <Skeleton css={styles.skeleton} delay={index * 100} />
  );
});

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
