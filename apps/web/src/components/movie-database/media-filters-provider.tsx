"use client";

import { usePathname } from "next/navigation";
import { useState, type PropsWithChildren } from "react";
import { getScrollBehavior } from "#src/utils/get-scroll-behavior.ts";
import type {
  GenreFilterType,
  MediaType,
  Sort,
} from "#src/utils/media-filters-context.ts";
import { MediaFiltersContext } from "#src/utils/media-filters-context.ts";

const emptyFilters = {
  genreFilterType: "all",
  sort: "popularity.desc",
  mediaType: "movie",
} satisfies {
  genreFilterType: GenreFilterType;
  sort: Sort;
  mediaType: MediaType;
};

interface MediaFilters {
  genres: Set<string>;
  genreFilterType: GenreFilterType;
  sort: Sort;
  mediaType: MediaType;
}

function buildFiltersSearchParams(filters: MediaFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.mediaType === "tv") {
    params.append("type", "tv");
  }
  filters.genres.forEach((genre) => {
    params.append("genre", genre);
  });
  if (filters.genreFilterType !== emptyFilters.genreFilterType) {
    params.append("genreFilterType", filters.genreFilterType);
  }
  if (filters.sort !== emptyFilters.sort) {
    params.append("sort", filters.sort);
  }
  return params;
}

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

  const initialMediaType: MediaType =
    defaultFilters?.mediaType ?? emptyFilters.mediaType;

  const [mediaFilters, setMediaFilters] = useState<MediaFilters>(() => ({
    genres: new Set<string>(defaultFilters?.genres),
    genreFilterType:
      defaultFilters?.genreFilterType ?? emptyFilters.genreFilterType,
    sort: defaultFilters?.sort ?? emptyFilters.sort,
    mediaType: initialMediaType,
  }));

  const buildUrl = (nextFilters: MediaFilters) => {
    const params = buildFiltersSearchParams(nextFilters);
    const searchString = params.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  const scrollToTop = () => {
    window.scrollTo({ behavior: getScrollBehavior(), top: 0 });
  };

  const commit = (next: MediaFilters) => {
    setMediaFilters(next);
    window.history.replaceState({}, "", buildUrl(next));
    scrollToTop();
  };

  const toggleGenre = (genreId: string) => {
    const newGenres = new Set(mediaFilters.genres);
    if (newGenres.has(genreId)) {
      newGenres.delete(genreId);
    } else {
      newGenres.add(genreId);
    }
    commit({ ...mediaFilters, genres: newGenres });
  };

  const toggleGenreUrl = (genreId: string) => {
    const newGenres = new Set(mediaFilters.genres);
    if (newGenres.has(genreId)) {
      newGenres.delete(genreId);
    } else {
      newGenres.add(genreId);
    }
    return buildUrl({ ...mediaFilters, genres: newGenres });
  };

  const setGenreFilterType = (type: GenreFilterType) => {
    commit({ ...mediaFilters, genreFilterType: type });
  };

  const setGenreFilterTypeUrl = (type: GenreFilterType) =>
    buildUrl({ ...mediaFilters, genreFilterType: type });

  const setSort = (sort: Sort) => {
    commit({ ...mediaFilters, sort });
  };

  const setSortUrl = (sort: Sort) => buildUrl({ ...mediaFilters, sort });

  const canReset =
    mediaFilters.genres.size > 0 ||
    mediaFilters.genreFilterType !== emptyFilters.genreFilterType ||
    mediaFilters.sort !== emptyFilters.sort;

  const setMediaType = (type: MediaType) => {
    commit({
      genres: new Set<string>(),
      genreFilterType: emptyFilters.genreFilterType,
      sort: emptyFilters.sort,
      mediaType: type,
    });
  };

  const setMediaTypeUrl = (type: MediaType) =>
    buildUrl({
      genres: new Set<string>(),
      genreFilterType: emptyFilters.genreFilterType,
      sort: emptyFilters.sort,
      mediaType: type,
    });

  const reset = () => {
    commit({
      genres: new Set<string>(),
      genreFilterType: emptyFilters.genreFilterType,
      sort: emptyFilters.sort,
      mediaType: mediaFilters.mediaType,
    });
  };

  const resetUrl = () =>
    buildUrl({
      genres: new Set<string>(),
      genreFilterType: emptyFilters.genreFilterType,
      sort: emptyFilters.sort,
      mediaType: mediaFilters.mediaType,
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
