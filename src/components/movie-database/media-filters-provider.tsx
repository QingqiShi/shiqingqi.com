// @inferEffectDependencies
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";
import type { GenreFilterType, Sort } from "@/utils/media-filters-context";
import { MediaFiltersContext } from "@/utils/media-filters-context";

const emptyFilters = {
  genreFilterType: "all" as GenreFilterType,
  sort: "popularity.desc" as Sort,
};

interface MediaFiltersProviderProps {
  defaultFilters?: {
    genres?: string[];
    genreFilterType?: GenreFilterType;
    sort?: Sort;
  };
}

export function MediaFiltersProvider({
  children,
  defaultFilters,
}: PropsWithChildren<MediaFiltersProviderProps>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mediaFilters, setMediaFilters] = useState(() => ({
    genres: new Set<string>(defaultFilters?.genres),
    genreFilterType:
      defaultFilters?.genreFilterType ?? emptyFilters.genreFilterType,
    sort: defaultFilters?.sort ?? emptyFilters.sort,
  }));

  const toggleGenre = (genreId: string) => {
    setMediaFilters((prev) => {
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
    const isActive = mediaFilters.genres.has(genreId);
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
    setMediaFilters((prev) => {
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
    setMediaFilters((prev) => ({ ...prev, sort }));
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
    mediaFilters.genres.size > 0 ||
    mediaFilters.genreFilterType !== emptyFilters.genreFilterType ||
    mediaFilters.sort !== emptyFilters.sort;

  const reset = () => {
    setMediaFilters({
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
    mediaFilters.genres.forEach((genre) => {
      url.searchParams.append("genre", genre);
    });

    // Filter type
    url.searchParams.delete("genreFilterType");
    if (mediaFilters.genreFilterType !== "all") {
      url.searchParams.append("genreFilterType", mediaFilters.genreFilterType);
    }

    // Sort
    url.searchParams.delete("sort");
    if (mediaFilters.sort !== "popularity.desc") {
      url.searchParams.append("sort", mediaFilters.sort);
    }

    window.history.replaceState({}, "", url);
    window.scrollTo({ behavior: "smooth", top: 0 });
  });

  return (
    <MediaFiltersContext
      value={{
        ...mediaFilters,
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
    </MediaFiltersContext>
  );
}
