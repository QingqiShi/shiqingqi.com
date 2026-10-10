"use client";

import * as stylex from "@stylexjs/stylex";
import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import dynamic from "next/dynamic";
import { Suspense, useDeferredValue, useState } from "react";
import { useLocale } from "#src/i18n/use-locale.ts";
import { t } from "#src/i18n.ts";
import { useMediaFilters } from "#src/movie-database/browse/filters/use-media-filters.ts";
import { MediaVirtuosoGrid } from "#src/movie-database/media-virtuoso-grid.tsx";
import { mediaListQuery } from "#src/movie-database/tmdb/queries/media-list-query.ts";

// The grid is the default view, and LyteNyte plus its two stylesheets is a lot
// of bytes to hand every visitor for a mode most of them never open. Loaded on
// demand, but still server-rendered, so a shared `?view=table` link paints the
// table rather than a hole.
const MediaTable = dynamic(() =>
  import("#src/movie-database/browse/table/media-table.tsx").then(
    (mod) => mod.MediaTable,
  ),
);

interface MediaListProps {
  initialPage: number;
}

export function MediaList({ initialPage }: MediaListProps) {
  const locale = useLocale();
  const { genres, matchMode, sort, mediaType, view } = useMediaFilters();

  // Use deferred value to prevent re-suspending when the genre changes
  const deferredGenre = useDeferredValue(genres);
  const deferredMatchMode = useDeferredValue(matchMode);
  const deferredSort = useDeferredValue(sort);
  const deferredMediaType = useDeferredValue(mediaType);

  const tmdbQueryOptions = mediaListQuery({
    type: deferredMediaType,
    page: initialPage,
    language: locale,
    genres: deferredGenre,
    matchMode: deferredMatchMode,
    sort: deferredSort,
  });

  const queryResult = useSuspenseInfiniteQuery(tmdbQueryOptions);

  // Identifies the result set. Both views use it to start over when the filters
  // change: the poster grid remounts Virtuoso, the table clears its search and
  // returns its viewport to the first row.
  const resultsKey = JSON.stringify(tmdbQueryOptions.queryKey);

  // Captured here rather than inside `MediaVirtuosoGrid` so it stays the
  // server-rendered page count. Switching to the table, scrolling in more
  // pages and switching back remounts the grid, and a per-mount capture would
  // hand Virtuoso every accumulated row as its initial render.
  const [initialItemCount] = useState(() => queryResult.data.length);

  const notFoundLabel =
    deferredMediaType === "tv"
      ? t({
          en: "No TV shows found that match the criteria. Update the filters.",
          zh: "没有找到符合条件的电视剧，请更新筛选条件",
        })
      : t({
          en: "No movies found that match the criteria. Update the filters.",
          zh: "没有找到符合条件的电影，请更新筛选条件",
        });

  if (view === "table") {
    return (
      // A local boundary, because the lazy chunk suspends on the first switch
      // to this view. Without it the suspension reaches the page's boundary
      // around the list, so clicking "Table" would show the poster skeleton.
      <Suspense fallback={<div css={styles.tablePlaceholder} />}>
        <MediaTable
          queryResult={queryResult}
          mediaType={deferredMediaType}
          resultsKey={resultsKey}
          notFoundLabel={notFoundLabel}
        />
      </Suspense>
    );
  }

  return (
    <MediaVirtuosoGrid
      queryResult={queryResult}
      virtuosoKey={resultsKey}
      initialItemCount={initialItemCount}
      notFoundLabel={notFoundLabel}
    />
  );
}

const styles = stylex.create({
  // Holds the space the table is about to occupy, so the page does not jump
  // while the grid chunk downloads. Same sizing as `MediaTable`'s grid shell.
  tablePlaceholder: {
    blockSize: {
      default: "60dvh",
      [breakpoints.md]: "calc(100dvh - 18rem)",
    },
    minBlockSize: "24rem",
  },
});
