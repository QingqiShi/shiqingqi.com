"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Grid } from "@/components/movie-database/grid";
import type { SupportedLocale } from "@/types";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { MovieCard } from "./movie-card";

interface MovieListProps {
  page: number;
  locale: SupportedLocale;
}

export function MovieList({ page, locale }: MovieListProps) {
  const { data } = useSuspenseInfiniteQuery(
    tmdbQueries.movieList({ page, language: locale })
  );

  return (
    <Grid>
      {data.pages.map((page) =>
        page.results?.map((movie) => (
          <MovieCard key={movie.id} movie={movie} locale={locale} />
        ))
      )}
    </Grid>
  );
}
