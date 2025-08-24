// @inferEffectDependencies
"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useState, type PropsWithChildren } from "react";
import type {
  GenreFilterType,
  MediaType,
  Sort,
} from "@/utils/media-filters-context";
import { MediaFiltersContext } from "@/utils/media-filters-context";

const emptyFilters = {
  genreFilterType: "all" as GenreFilterType,
  sort: "popularity.desc" as Sort,
  mediaType: "movie" as MediaType,
};

interface MediaFiltersProviderProps {
  defaultFilters?: {
    genres?: string[];
    genreFilterType?: GenreFilterType;
    sort?: Sort;
    mediaType?: MediaType;
  };
}

export function MediaFiltersProvider({
  children,
  defaultFilters,
}: PropsWithChildren<MediaFiltersProviderProps>) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const initialMediaType: MediaType =
    defaultFilters?.mediaType ?? emptyFilters.mediaType;

  const [mediaFilters, setMediaFilters] = useState(() => ({
    genres: new Set<string>(defaultFilters?.genres),
    genreFilterType:
      defaultFilters?.genreFilterType ?? emptyFilters.genreFilterType,
    sort: defaultFilters?.sort ?? emptyFilters.sort,
    mediaType: initialMediaType,
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

  const setMediaType = (type: MediaType) => {
    setMediaFilters({
      genres: new Set<string>(),
      genreFilterType: "all",
      sort: "popularity.desc",
      mediaType: type,
    });
  };

  const reset = () => {
    setMediaFilters((prev) => ({
      genres: new Set<string>(),
      genreFilterType: "all",
      sort: "popularity.desc",
      mediaType: prev.mediaType,
    }));
  };

  const resetUrl = () => {
    const newSearchParams = new URLSearchParams(searchParams);
    newSearchParams.delete("genre");
    newSearchParams.delete("genreFilterType");
    newSearchParams.delete("sort");
    const searchString = newSearchParams.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  const setMediaTypeUrl = (type: MediaType) => {
    const newSearchParams = new URLSearchParams();
    // Only add type param if it's TV (movie is default)
    if (type === "tv") {
      newSearchParams.append("type", "tv");
    }
    const searchString = newSearchParams.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  useEffect(() => {
    const url = new URL(window.location.href);
    // Clear any existing params
    url.searchParams.delete("genre");
    url.searchParams.delete("genreFilterType");
    url.searchParams.delete("sort");
    url.searchParams.delete("type");

    // Media type
    if (mediaFilters.mediaType === "tv") {
      url.searchParams.append("type", "tv");
    }

    // Genres
    mediaFilters.genres.forEach((genre) => {
      url.searchParams.append("genre", genre);
    });

    // Filter type
    if (mediaFilters.genreFilterType !== "all") {
      url.searchParams.append("genreFilterType", mediaFilters.genreFilterType);
    }

    // Sort
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
        setMediaType,
        setMediaTypeUrl,
        reset,
        resetUrl,
      }}
    >
      {children}
    </MediaFiltersContext>
  );
}
