"use client";

import useEventCallback from "@mui/utils/useEventCallback";
import type { ReactNode } from "react";
import { useEffect, useRef, useState, useTransition } from "react";
import { Grid } from "@/components/movie-database/grid";

interface MovieListProps {
  initialList?: ReactNode[];
  loadMoreAction: (page: number) => Promise<ReactNode[]>;
}

export function MovieList({
  initialList = [],
  loadMoreAction,
}: MovieListProps) {
  const [movies, setMovies] = useState(initialList);
  const [nextPage, setNextPage] = useState(2);

  const [isPending, startTransition] = useTransition();
  const loadMore = useEventCallback(() => {
    if (isPending) return;

    startTransition(async () => {
      const newList = await loadMoreAction(nextPage);
      setMovies([...movies, ...newList]);
      setNextPage(nextPage + 1);
    });
  });

  const loadMoreEl = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!loadMoreEl.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          console.log("intersect!");
          loadMore();
        }
      },
      { rootMargin: "0px 0px 500px 0px" }
    );
    observer.observe(loadMoreEl.current);
    return () => {
      observer.disconnect();
    };
  }, [loadMore]);

  return (
    <Grid>
      {movies.map((movie) => movie)}
      <div ref={loadMoreEl} />
    </Grid>
  );
}
