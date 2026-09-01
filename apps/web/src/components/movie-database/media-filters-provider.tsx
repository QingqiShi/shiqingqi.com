"use client";

import { usePathname } from "next/navigation";
import { useState, type PropsWithChildren } from "react";
import type { GenreFilterType } from "#src/utils/genre-filter-type.ts";
import { getScrollBehavior } from "#src/utils/get-scroll-behavior.ts";
import { MediaFiltersContext } from "#src/utils/media-filters-context.ts";
import type { MediaType } from "#src/utils/media-type.ts";
import type { MediaView } from "#src/utils/media-view.ts";
import type { Sort } from "#src/utils/sort.ts";

const emptyFilters = {
  genreFilterType: "all",
  sort: "popularity.desc",
  mediaType: "movie",
  view: "grid",
} satisfies {
  genreFilterType: GenreFilterType;
  sort: Sort;
  mediaType: MediaType;
  view: MediaView;
};

interface MediaFilters {
  genres: Set<string>;
  genreFilterType: GenreFilterType;
  sort: Sort;
  mediaType: MediaType;
  // Layout choice rather than a query input — it never feeds the TMDB request
  // and `reset` deliberately leaves it alone. It lives here because this
  // provider owns the page's whole search string: `buildFiltersSearchParams`
  // rebuilds the query from scratch on every commit, so any param managed
  // elsewhere would be dropped the next time a filter changed.
  view: MediaView;
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
  if (filters.view !== emptyFilters.view) {
    params.append("view", filters.view);
  }
  return params;
}

interface MediaFiltersProviderProps {
  defaultFilters?: {
    genres?: string[];
    genreFilterType?: GenreFilterType;
    sort?: Sort;
    mediaType?: MediaType;
    view?: MediaView;
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
    view: defaultFilters?.view ?? emptyFilters.view,
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

  // Switching media type clears every filter, but keeps the chosen layout —
  // the user asked to see TV shows, not to go back to posters.
  const clearedFilters = (mediaType: MediaType): MediaFilters => ({
    genres: new Set<string>(),
    genreFilterType: emptyFilters.genreFilterType,
    sort: emptyFilters.sort,
    mediaType,
    view: mediaFilters.view,
  });

  const setMediaType = (type: MediaType) => {
    commit(clearedFilters(type));
  };

  const setMediaTypeUrl = (type: MediaType) => buildUrl(clearedFilters(type));

  const reset = () => {
    commit(clearedFilters(mediaFilters.mediaType));
  };

  const resetUrl = () => buildUrl(clearedFilters(mediaFilters.mediaType));

  const setView = (view: MediaView) => {
    commit({ ...mediaFilters, view });
  };

  const setViewUrl = (view: MediaView) => buildUrl({ ...mediaFilters, view });

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
        setView,
        setViewUrl,
        reset,
        resetUrl,
      }}
    >
      {children}
    </MediaFiltersContext>
  );
}
