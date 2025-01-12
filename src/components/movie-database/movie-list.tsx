"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useRef } from "react";
import { Grid } from "@/components/movie-database/grid";
import { useIntersection } from "@/hooks/use-intersection";
import { ratio } from "@/tokens.stylex";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { useTranslationContext } from "@/utils/translation-context";
import { Skeleton } from "../shared/skeleton";
import { MovieCard } from "./movie-card";

interface MovieListProps {
  initialPage: number;
}

export function MovieList({ initialPage }: MovieListProps) {
  const { locale } = useTranslationContext();

  const { data, fetchNextPage, isFetchingNextPage, isFetchingPreviousPage } =
    useSuspenseInfiniteQuery(
      tmdbQueries.movieList({ page: initialPage, language: locale })
    );

  const loadNextElement = useRef<HTMLDivElement>(null);
  useIntersection({
    getElement: () => loadNextElement.current,
    onIntersect: () => void fetchNextPage(),
  });

  const loadedPages = data.pageParams as number[];

  return (
    <>
      {loadedPages[0]}
      <Grid>
        {isFetchingPreviousPage &&
          Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} css={styles.skeleton} delay={i * 100} />
          ))}
        {data?.pages.map((page) =>
          page.results?.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))
        )}
        {isFetchingNextPage &&
          Array.from({ length: 20 }).map((_, i) => (
            <Skeleton key={i} css={styles.skeleton} delay={i * 100} />
          ))}
      </Grid>
      <div ref={loadNextElement} />
    </>
  );
}

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
  },
});
