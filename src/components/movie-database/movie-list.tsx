"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Grid } from "@/components/movie-database/grid";
import { useIntersectionRefCallback } from "@/hooks/use-intersection-ref-callback";
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

  const {
    data,
    fetchNextPage,
    fetchPreviousPage,
    isFetchingNextPage,
    isFetchingPreviousPage,
    hasNextPage,
    hasPreviousPage,
  } = useSuspenseInfiniteQuery(
    tmdbQueries.movieList({ page: initialPage, language: locale })
  );

  // Load next page
  const loadNextCallbackRef = useIntersectionRefCallback<HTMLDivElement>({
    onIntersect: (entries) => {
      if (
        isFetchingNextPage ||
        entries.every((entry) => !entry.isIntersecting)
      ) {
        return;
      }
      void fetchNextPage();
    },
    rootMargin: "0px 0px 200% 0px",
  });

  // Load previous page
  const loadPrevCallbackRef = useIntersectionRefCallback<HTMLDivElement>({
    onIntersect: (entries) => {
      if (
        isFetchingPreviousPage ||
        entries.every((entry) => !entry.isIntersecting)
      ) {
        return;
      }
      void fetchPreviousPage();
    },
    rootMargin: "200% 0px 0px 0px",
  });

  const minPage = Math.min(...data.pages.map((page) => page.page));
  const paddedItems = Math.max((minPage - 1) * 20, 0);

  return (
    <>
      <Grid>
        {hasPreviousPage &&
          Array.from({ length: paddedItems }, (_, i) => (
            <Skeleton
              key={`before-${i}-${isFetchingPreviousPage ? "fetching" : "padded"}`}
              css={styles.skeleton}
              delay={i * 100}
              ref={loadPrevCallbackRef}
            />
          ))}
        {data?.pages.map((page) =>
          page.results?.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))
        )}
        {hasNextPage &&
          Array.from({ length: 20 }).map((_, i) => (
            <Skeleton
              key={`after-${i}-${isFetchingNextPage ? "fetching" : "padded"}`}
              css={styles.skeleton}
              delay={i * 100}
              ref={loadNextCallbackRef}
            />
          ))}
      </Grid>
    </>
  );
}

const styles = stylex.create({
  skeleton: {
    aspectRatio: ratio.poster,
    width: "100%",
    overflow: "hidden",
  },
  marker: {
    display: "contents",
  },
});
