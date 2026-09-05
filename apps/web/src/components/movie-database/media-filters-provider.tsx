"use client";

import * as stylex from "@stylexjs/stylex";
import { getScrollBehavior } from "@tuja/ui/utils/get-scroll-behavior";
import { usePathname } from "next/navigation";
import { useRef, useState, type PropsWithChildren } from "react";
import type { GenreFilterType } from "#src/utils/genre-filter-type.ts";
import { MediaFiltersContext } from "#src/utils/media-filters-context.ts";
import type { MediaType } from "#src/utils/media-type.ts";
import type { MediaView } from "#src/utils/media-view.ts";
import { readMediaFiltersSearchParams } from "#src/utils/read-media-filters-search-params.ts";
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

  const [mediaFilters, setMediaFilters] = useState<MediaFilters>(() => {
    // The client reads the live URL and not `defaultFilters`. `commit()`
    // moves the URL without the server, so a remount (for example after an
    // error boundary reset) must not replay the stale server snapshot.
    // `defaultFilters` is the server's reading of the request URL and serves
    // only the server render.
    const seed =
      typeof window === "undefined"
        ? defaultFilters
        : readMediaFiltersSearchParams(
            new URLSearchParams(window.location.search),
          );

    return {
      genres: new Set<string>(seed?.genres),
      genreFilterType: seed?.genreFilterType ?? emptyFilters.genreFilterType,
      sort: seed?.sort ?? emptyFilters.sort,
      mediaType: seed?.mediaType ?? emptyFilters.mediaType,
      view: seed?.view ?? emptyFilters.view,
    };
  });

  const buildUrl = (nextFilters: MediaFilters) => {
    const params = buildFiltersSearchParams(nextFilters);
    const searchString = params.toString();
    return `${pathname}${searchString ? `?${searchString}` : ""}`;
  };

  const resultsRef = useRef<HTMLDivElement>(null);

  // The list starts over, so a viewer who has scrolled into it comes back to
  // its top, where the filter bar holds under the header, and not to the top
  // of the page, which would carry the bar they just used out of view. A
  // viewer still above the results stays where they are.
  const scrollToResults = () => {
    const results = resultsRef.current;
    if (!results) return;
    const clearance =
      Number.parseFloat(getComputedStyle(results).scrollMarginBlockStart) || 0;
    if (results.getBoundingClientRect().top >= clearance) return;
    results.scrollIntoView({ behavior: getScrollBehavior(), block: "start" });
  };

  const commit = (next: MediaFilters) => {
    setMediaFilters(next);
    window.history.replaceState({}, "", buildUrl(next));
    scrollToResults();
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

  const setSort = (sort: Sort) => {
    commit({ ...mediaFilters, sort });
  };

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

  const reset = () => {
    commit(clearedFilters(mediaFilters.mediaType));
  };

  const resetUrl = () => buildUrl(clearedFilters(mediaFilters.mediaType));

  const setView = (view: MediaView) => {
    commit({ ...mediaFilters, view });
  };

  return (
    <MediaFiltersContext
      value={{
        ...mediaFilters,
        canReset,
        toggleGenre,
        toggleGenreUrl,
        setGenreFilterType,
        setSort,
        setMediaType,
        setView,
        reset,
        resetUrl,
      }}
    >
      <div ref={resultsRef} css={styles.results}>
        {children}
      </div>
    </MediaFiltersContext>
  );
}

const styles = stylex.create({
  // Scrolls to the line the filter bar holds at, so the bar lands under the
  // header rather than behind it.
  results: {
    scrollMarginBlockStart: "var(--header-controls-clearance, 0px)",
  },
});
