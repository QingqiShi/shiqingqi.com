// @inferEffectDependencies
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";
import type { GenreFilterType, Sort } from "@/utils/movie-filters-context";
import { MovieFiltersContext } from "@/utils/movie-filters-context";

const emptyFilters = {
  genreFilterType: "all" as GenreFilterType,
  sort: "popularity.desc" as Sort,
};

interface MovieFiltersProviderProps {
  defaultFilters?: {
    genres?: string[];
    genreFilterType?: GenreFilterType;
    sort?: Sort;
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
    genreFilterType:
      defaultFilters?.genreFilterType ?? emptyFilters.genreFilterType,
    sort: defaultFilters?.sort ?? emptyFilters.sort,
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
    if (type !== emptyFilters.genreFilterType) {
      newSearchParams.append("genreFilterType", type);
    }
    const searchString = newSearchParams.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  const setSort = (sort: Sort) => {
    setMovieFilters((prev) => ({ ...prev, sort }));
  };

  const setSortUrl = (sort: Sort) => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("sort");
    if (sort !== emptyFilters.sort) {
      newSearchParams.append("sort", sort);
    }
    const searchString = newSearchParams.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  const canReset =
    movieFilters.genres.size > 0 ||
    movieFilters.genreFilterType !== emptyFilters.genreFilterType ||
    movieFilters.sort !== emptyFilters.sort;

  const reset = () => {
    setMovieFilters({
      genres: new Set<string>(),
      genreFilterType: "all",
      sort: "popularity.desc",
    });
  };

  const resetUrl = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("genre");
    newSearchParams.delete("genreFilterType");
    newSearchParams.delete("sort");
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
    if (movieFilters.genreFilterType !== "all") {
      url.searchParams.append("genreFilterType", movieFilters.genreFilterType);
    }

    // Sort
    url.searchParams.delete("sort");
    if (movieFilters.sort !== "popularity.desc") {
      url.searchParams.append("sort", movieFilters.sort);
    }

    window.history.replaceState({}, "", url);
    window.scrollTo({ behavior: "smooth", top: 0 });
  });

  return (
    <MovieFiltersContext
      value={{
        ...movieFilters,
        canReset,
        toggleGenre,
        toggleGenreUrl,
        setGenreFilterType,
        setGenreFilterTypeUrl,
        setSort,
        setSortUrl,
        reset,
        resetUrl,
      }}
    >
      {children}
    </MovieFiltersContext>
  );
}
