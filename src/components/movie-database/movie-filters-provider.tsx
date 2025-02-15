"use client";

import { useEffect, useState, type PropsWithChildren } from "react";
import { MovieFiltersContext } from "@/utils/movie-filters-context";

interface MovieFiltersProviderProps {
  defaultFilters?: {
    genres?: string[];
  };
}

export function MovieFiltersProvider({
  children,
  defaultFilters,
}: PropsWithChildren<MovieFiltersProviderProps>) {
  const [movieFilters, setMovieFilters] = useState(() => ({
    genres: new Set<string>(defaultFilters?.genres),
  }));

  const toggleGenre = (genreId: string) => {
    setMovieFilters((prev) => {
      const newGenres = new Set(prev.genres);
      if (newGenres.has(genreId)) {
        newGenres.delete(genreId);
      } else {
        newGenres.add(genreId);
      }
      return { ...prev, genres: newGenres };
    });
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    // Clear any existing genres
    url.searchParams.delete("genre");

    // Assuming genres is an array of genre strings
    movieFilters.genres.forEach((genre) => {
      url.searchParams.append("genre", genre);
    });

    window.history.replaceState({}, "", url);
  }, [movieFilters.genres]);

  return (
    <MovieFiltersContext value={{ ...movieFilters, toggleGenre }}>
      {children}
    </MovieFiltersContext>
  );
}
