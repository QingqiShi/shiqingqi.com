import { createContext, use } from "react";
import type { MediaListItem } from "#src/utils/media-list-item.ts";

/**
 * Everything a table cell needs that is expensive to build or lives outside
 * the grid: `Intl` formatters, the genre id → name lookup, the poster CDN
 * prefix, and the popularity scale.
 *
 * Cell renderers are ordinary components inside the app's React tree, so they
 * could each build their own formatters — but the grid mounts hundreds of
 * cells and remounts them on every scroll, and `Intl` constructors are the
 * expensive kind of cheap. Building them once above the grid keeps cell
 * renders to a context read.
 */
export interface MediaTableContextValue {
  readonly rating: Intl.NumberFormat;
  readonly compact: Intl.NumberFormat;
  readonly date: Intl.DateTimeFormat;
  /** Genre id → localised name, from the genres query for the current type. */
  readonly genreNames: ReadonlyMap<number, string>;
  /** ISO 639-1 code → localised language name, or the raw code as fallback. */
  readonly languageName: (code: string) => string;
  /** Largest popularity among the loaded rows — the meter's full-scale mark. */
  readonly maxPopularity: number;
  /** TMDB image CDN prefix, e.g. `https://image.tmdb.org/t/p/`. */
  readonly posterBaseUrl: string | null;
  /** TMDB's advertised poster widths, for `TmdbImage` to build a `srcSet`. */
  readonly posterSizes: ReadonlyArray<string> | null;
  /** Locale-aware detail page href for a row. */
  readonly hrefFor: (media: MediaListItem) => string;
  /** Cycles a column through ascending → descending → unsorted. */
  readonly toggleSort: (columnId: string) => void;
}

export const MediaTableContext = createContext<MediaTableContextValue | null>(
  null,
);

export function useMediaTable() {
  const value = use(MediaTableContext);
  if (!value) {
    throw new Error("`useMediaTable` must be used within a `MediaTable`");
  }
  return value;
}
