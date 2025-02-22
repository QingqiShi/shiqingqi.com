"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";
import type { GenreFilterType } from "@/utils/movie-filters-context";
import { MovieFiltersContext } from "@/utils/movie-filters-context";

interface MovieFiltersProviderProps {
  defaultFilters?: {
    genres?: string[];
    genreFilterType?: GenreFilterType;
  };
}

export function MovieFiltersProvider({
  children,
  defaultFilters,
}: PropsWithChildren<MovieFiltersProviderProps>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [movieFilters, setMovieFilters] = useState(() => ({
    genres: new Set<string>(defaultFilters?.genres),
    genreFilterType: defaultFilters?.genreFilterType ?? "all",
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

  const toggleGenreUrl = (genreId: string) => {
    const isActive = movieFilters.genres.has(genreId);
    const newSearchParams = new URLSearchParams(searchParams);
    if (isActive) {
      newSearchParams.delete("genre", genreId);
    } else {
      newSearchParams.append("genre", genreId);
    }
    const searchString = newSearchParams.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  const setGenreFilterType = (type: GenreFilterType) => {
    setMovieFilters((prev) => {
      return { ...prev, genreFilterType: type };
    });
  };

  const setGenreFilterTypeUrl = (type: GenreFilterType) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("genreFilterType");
    if (type === "any") {
      newSearchParams.append("genreFilterType", "any");
    }
    const searchString = newSearchParams.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    // Clear any existing genres
    url.searchParams.delete("genre");

    // Assuming genres is an array of genre strings
    movieFilters.genres.forEach((genre) => {
      url.searchParams.append("genre", genre);
    });

    // Filter type
    url.searchParams.delete("genreFilterType");
    if (movieFilters.genreFilterType === "any") {
      url.searchParams.append("genreFilterType", movieFilters.genreFilterType);
    }

    window.history.replaceState({}, "", url);
  }, [movieFilters.genres, movieFilters.genreFilterType]);

  return (
    <MovieFiltersContext
      value={{
        ...movieFilters,
        toggleGenre,
        toggleGenreUrl,
        setGenreFilterType,
        setGenreFilterTypeUrl,
      }}
    >
      {children}
    </MovieFiltersContext>
  );
}
