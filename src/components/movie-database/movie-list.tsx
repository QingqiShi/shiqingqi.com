"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useLayoutEffect, useState } from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { Grid } from "@/components/movie-database/grid";
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

  const { data, fetchNextPage, hasNextPage } = useSuspenseInfiniteQuery(
    tmdbQueries.movieList({ page: initialPage, language: locale })
  );

  const [height, setHeight] = useState(() =>
    typeof window !== "undefined" ? window.innerHeight : 0
  );
  useLayoutEffect(() => {
    const onResize = () => setHeight(window.innerHeight);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  });

  return (
    <>
      <VirtuosoGrid
        style={{ height: "100dvh" }}
        data={data.movies}
        components={gridComponents}
        itemContent={(index) =>
          data.movies[index] ? (
            <MovieCard movie={data.movies[index]} />
          ) : (
            <Skeleton css={styles.skeleton} delay={index * 100} />
          )
        }
        endReached={
          hasNextPage
            ? () => {
                console.log("endReached");
                void fetchNextPage();
              }
            : undefined
        }
        increaseViewportBy={height}
      />
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
  marker: {
    display: "contents",
  },
});
