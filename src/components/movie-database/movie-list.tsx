"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { VirtuosoGrid } from "react-virtuoso";
import { breakpoints } from "@/breakpoints";
import { Grid } from "@/components/movie-database/grid";
import { color, ratio, space } from "@/tokens.stylex";
import { startViewTransition } from "@/utils/start-view-transition";
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

  const searchParams = useSearchParams();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(
    searchParams.getAll("genre") ?? undefined
  );

  const { data, fetchNextPage, hasNextPage } = useSuspenseInfiniteQuery(
    tmdbQueries.movieList({
      page: initialPage,
      language: locale,
      with_genres: deferredGenre.join(",") || undefined,
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

  // Allow reading genres without re-running useEffect
  const genresRef = useRef(deferredGenre);
  useEffect(() => {
    genresRef.current = deferredGenre;
  }, [deferredGenre]);

  // Deferred state for animation!
  const [movies, setState] = useState(data.movies);
  const prevGenres = useRef(deferredGenre);
  useEffect(() => {
    if (prevGenres.current !== genresRef.current) {
      // Start animation if genres changed
      prevGenres.current = genresRef.current;
      void startViewTransition(() => {
        setState(data.movies);
      });
    } else {
      // Otherwise, just update the state (e.g. from infinite scroll)
      setState(data.movies);
    }
  }, [data.movies]);

  if (!movies) {
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
  marker: {
    display: "contents",
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
