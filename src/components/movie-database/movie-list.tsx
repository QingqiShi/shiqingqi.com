"use client";

import type { MovieListItem } from "@/utils/tmdb-api";
import * as tmdbQueries from "@/utils/tmdb-queries";
import { MediaList } from "./media-list";
import { MovieCard } from "./movie-card";

interface MovieListProps {
  initialPage: number;
  notFoundLabel: string;
}

export function MovieList({ initialPage, notFoundLabel }: MovieListProps) {
  return (
    <MediaList<MovieListItem>
      initialPage={initialPage}
      notFoundLabel={notFoundLabel}
      queryOptions={tmdbQueries.movieList}
      renderItem={(movie, allowFollow) => (
        <MovieCard movie={movie} allowFollow={allowFollow} />
      )}
    />
  );
}
