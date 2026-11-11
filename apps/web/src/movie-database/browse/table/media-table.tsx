"use client";

// Structure tokens + grid element styles only. The colour theme is supplied
// below from the app's own design tokens, so LyteNyte's bundled palettes never
// ship and the grid follows the site's light/dark scheme for free.
import "@1771technologies/lytenyte-pro/design.css";
import "@1771technologies/lytenyte-pro/grid.css";
import "./lytenyte-license";
import type { Grid } from "@1771technologies/lytenyte-pro";
import { useClientDataSource } from "@1771technologies/lytenyte-pro";
import * as stylex from "@stylexjs/stylex";
import {
  useQuery,
  type UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import { t } from "@tuja/i18n";
import { getLocalePath } from "@tuja/i18n/get-locale-path";
import { useLocale } from "@tuja/i18n/use-locale";
import { Card } from "@tuja/ui/components/card";
import { Divider } from "@tuja/ui/components/divider";
import { EmptyState } from "@tuja/ui/components/empty-state";
import { rhythm } from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { configurationQuery } from "#src/movie-database/tmdb/queries/configuration-query.ts";
import { genresQuery } from "#src/movie-database/tmdb/queries/genres-query.ts";
import type { MediaListItem, MediaType } from "#src/movie-database/types.ts";
import {
  buildColumns,
  withUserColumnState,
  type ColumnLabels,
} from "./build-columns";
import { MediaTableContext } from "./media-table-context";
import { MediaTableFooter } from "./media-table-footer";
import { MediaTableGrid } from "./media-table-grid";
import { MediaTableToolbar } from "./media-table-toolbar";
import { downloadCsv } from "./to-delimited-cell";
import type { MediaColumn, MediaTableSpec, MediaSortDirection } from "./types";

/**
 * Module scope, not an inline arrow: `useClientDataSource` memoizes the whole
 * row pipeline on this identity, so a fresh closure per render would re-derive
 * (and re-sort) every loaded row on every keystroke in the search box.
 */
const leafId = (media: MediaListItem) => String(media.id);

/** Next direction in the ascending → descending → unsorted cycle. */
function nextSortDirection(
  current: MediaSortDirection | undefined,
): MediaSortDirection | undefined {
  if (current === "asc") return "desc";
  if (current === "desc") return undefined;
  return "asc";
}

function matchesQuery(
  media: MediaListItem,
  query: string,
  genreNames: ReadonlyMap<number, string>,
) {
  const haystack = [
    media.title,
    media.originalTitle,
    media.overview,
    ...(media.genreIds ?? []).map((id) => genreNames.get(id)),
  ];
  return haystack.some((part) => part?.toLowerCase().includes(query));
}

interface MediaTableProps {
  queryResult: UseSuspenseInfiniteQueryResult<MediaListItem[]>;
  mediaType: MediaType;
  /** Identity of the result set; changing it starts the table over. */
  resultsKey: string;
  notFoundLabel: string;
}

/**
 * Data-table view of the discover results, powered by LyteNyte Grid PRO.
 *
 * Sorting, searching and column layout are client side over the rows fetched
 * so far — scrolling near the bottom pulls in the next TMDB page, exactly as
 * the poster grid does.
 */
export function MediaTable({
  queryResult,
  mediaType,
  resultsKey,
  notFoundLabel,
}: MediaTableProps) {
  const locale = useLocale();
  const router = useRouter();
  const apiRef = useRef<Grid.API<MediaTableSpec> | null>(null);
  const [search, setSearch] = useState("");

  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queryResult;

  // Both queries are prefetched and hydrated by the page, so they resolve from
  // cache on the first render. `useQuery` rather than its suspense sibling: a
  // cache miss should degrade the chrome, not blank the table.
  const { data: config } = useQuery(configurationQuery());
  const { data: genreData } = useQuery(
    genresQuery({ type: mediaType, language: locale }),
  );

  const genreNames = new Map<number, string>();
  for (const genre of genreData?.genres ?? []) {
    if (genre.name !== undefined) {
      genreNames.set(genre.id, genre.name);
    }
  }

  const languageDisplay = new Intl.DisplayNames([locale], {
    type: "language",
    fallback: "code",
  });
  const languageName = (code: string) => {
    let name: string | undefined;
    try {
      name = languageDisplay.of(code);
    } catch {
      // `of` throws on structurally invalid tags, and TMDB occasionally
      // returns values ("cn", "xx") that are not valid ISO 639-1.
    }
    return name ?? code;
  };

  const labels: ColumnLabels = {
    title: t({ en: "Title", zh: "标题" }),
    score: t({ en: "Score", zh: "评分" }),
    votes: t({ en: "Votes", zh: "评分人数" }),
    released:
      mediaType === "tv"
        ? t({ en: "First aired", zh: "首播日期" })
        : t({ en: "Released", zh: "上映日期" }),
    genres: t({ en: "Genres", zh: "类型" }),
    popularity: t({ en: "Popularity", zh: "热度" }),
    language: t({ en: "Language", zh: "语言" }),
    overview: t({ en: "Overview", zh: "简介" }),
  };

  // Column state lives here so the grid can resize, reorder and hide columns.
  // It is rebuilt when an input baked into the definitions changes: the media
  // type renames the date column, and the genre map is captured by the genres
  // `field` closure. `withUserColumnState` carries the user's arrangement over
  // that rebuild.
  const columnsKey = `${mediaType}|${locale}|${String(genreNames.size)}`;
  const [columnsState, setColumnsState] = useState(() => ({
    key: columnsKey,
    columns: buildColumns({ labels, locale, genreNames, languageName }),
  }));
  const columns =
    columnsState.key === columnsKey
      ? columnsState.columns
      : withUserColumnState(
          buildColumns({ labels, locale, genreNames, languageName }),
          columnsState.columns,
        );
  if (columnsState.key !== columnsKey) {
    setColumnsState({ key: columnsKey, columns });
  }

  // A filter change swaps the whole result set out from under the table. The
  // poster grid gets this from its remount; do the same work here — drop the
  // search term, and remount the grid so its viewport starts at the first row.
  // Left alone, the browser clamps the old scroll offset to the shorter list,
  // stranding the user at the bottom and tripping the load-more threshold on
  // the way.
  const [resultsState, setResultsState] = useState(resultsKey);
  if (resultsState !== resultsKey) {
    setResultsState(resultsKey);
    setSearch("");
  }

  const setColumns = (next: MediaColumn[]) => {
    setColumnsState({ key: columnsKey, columns: next });
  };

  const toggleSort = (columnId: string) => {
    setColumnsState((prev) => ({
      key: prev.key,
      columns: prev.columns.map((column) =>
        column.id === columnId
          ? { ...column, sort: nextSortDirection(column.sort) }
          : // Single-column sort: adopting a new sort clears the old one.
            { ...column, sort: undefined },
      ),
    }));
  };

  // Hidden columns do not sort. A hidden column renders no header, so its sort
  // would be an ordering with nothing on screen to explain or undo it. The
  // `sort` value stays on the column, so re-showing it restores the order.
  const sortedColumn = columns.find((column) => column.sort && !column.hide);
  const comparator = sortedColumn?.comparator;
  const comparatorSort: Grid.T.SortFn<MediaListItem> | null = comparator
    ? (left, right) =>
        left.kind === "leaf" && right.kind === "leaf"
          ? comparator(left.data, right.data)
          : 0
    : null;
  const sort = sortedColumn
    ? [
        {
          dim: comparatorSort ?? sortedColumn,
          descending: sortedColumn.sort === "desc",
        },
      ]
    : null;

  // Search runs ahead of the data source rather than through its `filter`
  // hook, so the match count is available to the footer. At a few hundred rows
  // the difference is immeasurable.
  const query = search.trim().toLowerCase();
  const visibleItems = query
    ? items.filter((media) => matchesQuery(media, query, genreNames))
    : items;

  // Scaled against every loaded row, not the filtered set, so the meter does
  // not rescale itself as the user types.
  const maxPopularity = items.reduce(
    (max, media) => Math.max(max, media.popularity ?? 0),
    0,
  );
  // Handed to `TmdbImage` as-is: it builds the `srcSet` from TMDB's advertised
  // widths so the browser picks the derivative that fits the thumbnail.
  const posterBaseUrl =
    config?.images?.secure_base_url ?? config?.images?.base_url ?? null;
  const posterSizes = config?.images?.poster_sizes ?? null;

  const hrefFor = (media: MediaListItem) =>
    getLocalePath(
      `/movie-database/${String(media.mediaType)}/${media.id.toString()}`,
      locale,
    );

  const rowSource = useClientDataSource<MediaTableSpec>({
    data: visibleItems,
    sort,
    leafIdFn: leafId,
  });

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const exportCsv = () => {
    void apiRef.current?.exportData().then(
      (exported) => {
        downloadCsv(
          [exported.headers, ...exported.data],
          `${mediaType === "tv" ? "tv-shows" : "movies"}.csv`,
        );
      },
      () => undefined,
    );
  };

  const noMatchesLabel = t({
    en: "Nothing matches that search — try a different term.",
    zh: "没有匹配的结果，换个关键词试试。",
  });
  const tableLabel =
    mediaType === "tv"
      ? t({ en: "TV shows table", zh: "电视剧表格" })
      : t({ en: "Movies table", zh: "电影表格" });

  const ratingFormat = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  const compactFormat = new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  });
  const dateFormat = new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeZone: "UTC",
  });

  return (
    <MediaTableContext
      value={{
        rating: ratingFormat,
        compact: compactFormat,
        date: dateFormat,
        genreNames,
        languageName,
        maxPopularity,
        posterBaseUrl,
        posterSizes,
        hrefFor,
        toggleSort,
      }}
    >
      <Card
        padding="none"
        role="region"
        aria-label={tableLabel}
        css={styles.panel}
      >
        <MediaTableToolbar
          search={search}
          onSearchChange={setSearch}
          columns={columns}
          onColumnsChange={setColumns}
          exportDisabled={visibleItems.length === 0}
          onExport={exportCsv}
        />
        <Divider />

        {visibleItems.length === 0 ? (
          <EmptyState
            icon="🙉"
            title={query ? noMatchesLabel : notFoundLabel}
          />
        ) : (
          <MediaTableGrid
            apiRef={apiRef}
            resultsKey={resultsKey}
            rowSource={rowSource}
            columns={columns}
            onColumnsChange={setColumns}
            onOpenRow={(media) => {
              router.push(hrefFor(media));
            }}
            onLoadMore={loadMore}
          />
        )}

        <Divider />
        <MediaTableFooter
          query={query}
          visibleCount={visibleItems.length}
          loadedCount={items.length}
          isFetchingNextPage={isFetchingNextPage}
          hasNextPage={hasNextPage}
          onLoadMore={loadMore}
        />
      </Card>
    </MediaTableContext>
  );
}

const styles = stylex.create({
  panel: {
    marginBlockEnd: rhythm.group,
    gap: 0,
    overflow: "hidden",
  },
});
