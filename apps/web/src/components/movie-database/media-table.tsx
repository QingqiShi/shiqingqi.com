"use client";

// Structure tokens + grid element styles only. The colour theme is supplied
// below from the app's own design tokens, so LyteNyte's bundled palettes never
// ship and the grid follows the site's light/dark scheme for free.
import "@1771technologies/lytenyte-pro/design.css";
import "@1771technologies/lytenyte-pro/grid.css";
import "#src/utils/lytenyte-license.ts";
import { Grid, useClientDataSource } from "@1771technologies/lytenyte-pro";
import { DownloadSimpleIcon } from "@phosphor-icons/react/dist/ssr/DownloadSimple";
import { MagnifyingGlassIcon } from "@phosphor-icons/react/dist/ssr/MagnifyingGlass";
import { SlidersHorizontalIcon } from "@phosphor-icons/react/dist/ssr/SlidersHorizontal";
import * as stylex from "@stylexjs/stylex";
import {
  useQuery,
  type UseSuspenseInfiniteQueryResult,
} from "@tanstack/react-query";
import { breakpoints } from "@tuja/ui/breakpoints.stylex";
import { Button } from "@tuja/ui/components/button";
import { Checkbox } from "@tuja/ui/components/checkbox";
import { MenuButton } from "@tuja/ui/components/menu-button";
import { Spinner } from "@tuja/ui/components/spinner";
import { TextField } from "@tuja/ui/components/text-field";
import { corner } from "@tuja/ui/primitives/corner.stylex";
import {
  border,
  color,
  font,
  layout,
  shadow,
  space,
} from "@tuja/ui/tokens.stylex";
import { useRouter } from "next/navigation";
import { useRef, useState, useSyncExternalStore } from "react";
import { useLocale } from "#src/hooks/use-locale.ts";
import { t } from "#src/i18n.ts";
import { copyTextToClipboard } from "#src/utils/copy-text-to-clipboard.ts";
import type { MediaType } from "#src/utils/media-filter-types.ts";
import { getLocalePath } from "#src/utils/pathname.ts";
import * as tmdbQueries from "#src/utils/tmdb-queries.ts";
import type { MediaListItem } from "#src/utils/types.ts";
import {
  MediaGenresCell,
  MediaLanguageCell,
  MediaOverviewCell,
  MediaPopularityCell,
  MediaReleaseDateCell,
  MediaRowNumberCell,
  MediaRowNumberHeader,
  MediaScoreCell,
  MediaTableHeader,
  MediaTitleCell,
  MediaVotesCell,
} from "./media-table-cells";
import { MediaTableContext } from "./media-table-context";
import type {
  MediaColumn,
  MediaGridSpec,
  MediaSortDirection,
} from "./media-table-spec";

const ROW_HEIGHT = 76;
const HEADER_HEIGHT = 44;
/** Distance from the bottom of the viewport that triggers the next page. */
const LOAD_MORE_THRESHOLD = ROW_HEIGHT * 8;

interface ColumnLabels {
  readonly title: string;
  readonly score: string;
  readonly votes: string;
  readonly released: string;
  readonly genres: string;
  readonly popularity: string;
  readonly language: string;
  readonly overview: string;
}

interface BuildColumnsParams {
  readonly labels: ColumnLabels;
  readonly locale: string;
  readonly genreNames: ReadonlyMap<number, string>;
  readonly languageName: (code: string) => string;
}

function buildColumns({
  labels,
  locale,
  genreNames,
  languageName,
}: BuildColumnsParams): MediaColumn[] {
  return [
    {
      id: "title",
      name: labels.title,
      field: "title",
      pin: "start",
      width: 280,
      widthMin: 180,
      cellRenderer: MediaTitleCell,
      // `<`/`>` on strings compares UTF-16 code units, which buries accented
      // Latin titles below `z` and orders Chinese titles by codepoint rather
      // than by pinyin. Collation is the whole point of a title sort.
      comparator: (left, right) =>
        (left.title ?? "").localeCompare(right.title ?? "", locale),
    },
    {
      id: "rating",
      name: labels.score,
      field: "rating",
      type: "number",
      width: 104,
      cellRenderer: MediaScoreCell,
    },
    {
      id: "voteCount",
      name: labels.votes,
      field: "voteCount",
      type: "number",
      width: 100,
      cellRenderer: MediaVotesCell,
    },
    {
      id: "releaseDate",
      name: labels.released,
      // Left as the raw ISO string: the client source compares field values
      // with `<`/`>`, and ISO 8601 sorts chronologically as text.
      field: "releaseDate",
      width: 124,
      cellRenderer: MediaReleaseDateCell,
    },
    {
      id: "genres",
      name: labels.genres,
      // Resolved to names rather than ids so sorting, CSV export and clipboard
      // copy all carry something a human can read.
      field: ({ row }) =>
        row.kind === "leaf"
          ? (row.data.genreIds ?? [])
              .map((id) => genreNames.get(id))
              .filter((name) => name !== undefined)
              .join(", ")
          : undefined,
      width: 208,
      cellRenderer: MediaGenresCell,
    },
    {
      id: "popularity",
      name: labels.popularity,
      field: "popularity",
      type: "number",
      width: 120,
      cellRenderer: MediaPopularityCell,
    },
    {
      id: "originalLanguage",
      name: labels.language,
      field: ({ row }) =>
        row.kind === "leaf" && row.data.originalLanguage
          ? languageName(row.data.originalLanguage)
          : undefined,
      width: 116,
      cellRenderer: MediaLanguageCell,
    },
    {
      id: "overview",
      name: labels.overview,
      field: "overview",
      width: 420,
      widthMin: 260,
      widthFlex: 1,
      unsortable: true,
      cellRenderer: MediaOverviewCell,
    },
  ];
}

/**
 * Re-applies the parts of the column state the user owns — sort, visibility,
 * width and order — on top of freshly built definitions.
 *
 * The definitions have to be rebuilt when their inputs change (the date column
 * is relabelled per media type, and the genre column's `field` closes over the
 * genre map), but everything the user arranged lives in the same array. Without
 * this, loading the TV genre list would quietly undo their sort.
 */
function withUserColumnState(
  next: MediaColumn[],
  previous: MediaColumn[],
): MediaColumn[] {
  const byId = new Map(previous.map((column) => [column.id, column]));
  const order = new Map(previous.map((column, index) => [column.id, index]));
  return next
    .map((column) => {
      const prior = byId.get(column.id);
      // `pin` is in here because dragging a header across pane boundaries is a
      // move *and* a pin change — carrying the order without the pin would put
      // a column back in the frozen pane it was just dragged out of.
      return prior
        ? {
            ...column,
            sort: prior.sort,
            hide: prior.hide,
            width: prior.width,
            pin: prior.pin,
          }
        : column;
    })
    .sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    );
}

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

/** Exported cell values are `unknown`; render the primitives, JSON the rest. */
function cellToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

/** Leading characters that make a spreadsheet evaluate a cell as a formula. */
const CSV_FORMULA_LEAD = /^[=+\-@\t\r]/;

/**
 * Escape one cell for a delimited export. Used for both the CSV download and
 * the tab-separated clipboard copy — the destination is a spreadsheet either
 * way, so both need the same treatment.
 */
function toDelimitedCell(value: unknown, delimiter: string) {
  const text = cellToText(value);
  // TMDB titles and overviews are community-edited free text, and a cell
  // starting with `=` is a live formula once it lands in Excel or Sheets. A
  // leading apostrophe forces it back to text. Numbers are exempt so a
  // negative value stays a number.
  const safe =
    typeof value !== "number" && CSV_FORMULA_LEAD.test(text)
      ? `'${text}`
      : text;
  // A bare CR is a row separator to some readers, so it has to be quoted too.
  return safe.includes(delimiter) || /["\n\r]/.test(safe)
    ? `"${safe.replaceAll('"', '""')}"`
    : safe;
}

function downloadCsv(rows: unknown[][], filename: string) {
  const csv = rows
    .map((row) => row.map((cell) => toDelimitedCell(cell, ",")).join(","))
    .join("\n");
  // The BOM keeps Excel from mangling non-ASCII titles on open.
  const blob = new Blob([`\u{FEFF}${csv}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  // Matching `triggerDownload` in the pixel-creature creator: some browsers
  // ignore a click on a detached anchor, and revoking on the same tick can
  // free the blob before the download has started.
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 1000);
}

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToReducedMotion(onChange: () => void) {
  const query = window.matchMedia(REDUCED_MOTION_QUERY);
  query.addEventListener("change", onChange);
  return () => {
    query.removeEventListener("change", onChange);
  };
}

function getReducedMotion() {
  return window.matchMedia(REDUCED_MOTION_QUERY).matches;
}

/** No media queries on the server; hydration corrects this immediately. */
function getServerReducedMotion() {
  return false;
}

/**
 * Reactive `prefers-reduced-motion`. LyteNyte's row animations have no
 * reduced-motion branch of their own, so the preference has to be read here and
 * handed to the grid as a prop.
 */
function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    getReducedMotion,
    getServerReducedMotion,
  );
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
  const apiRef = useRef<Grid.API<MediaGridSpec> | null>(null);
  const [search, setSearch] = useState("");
  const prefersReducedMotion = usePrefersReducedMotion();

  const {
    data: items,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = queryResult;

  // Both queries are prefetched and hydrated by the page, so they resolve from
  // cache on the first render. `useQuery` rather than its suspense sibling: a
  // cache miss should degrade the chrome, not blank the table.
  const { data: config } = useQuery(tmdbQueries.configuration);
  const { data: genreData } = useQuery(
    tmdbQueries.genres({ type: mediaType, language: locale }),
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
    try {
      return languageDisplay.of(code) ?? code;
    } catch {
      // `of` throws on structurally invalid tags, and TMDB occasionally
      // returns values ("cn", "xx") that are not valid ISO 639-1.
      return code;
    }
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

  const rowSource = useClientDataSource<MediaGridSpec>({
    data: visibleItems,
    sort,
    leafIdFn: leafId,
  });

  const loadMore = () => {
    if (hasNextPage && !isFetchingNextPage) {
      void fetchNextPage();
    }
  };

  const events: Grid.Events<MediaGridSpec> = {
    cell: {
      doubleClick: ({ row, api }) => {
        if (api.rowIsLeaf(row)) router.push(hrefFor(row.data));
      },
    },
    viewport: {
      scroll: ({ viewport }) => {
        const remaining =
          viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight;
        if (remaining < LOAD_MORE_THRESHOLD) loadMore();
      },
      keyDown: ({ event, api }) => {
        if (!(event.metaKey || event.ctrlKey)) return;
        // `key` handles Caps Lock (`"C"`) and is the layout-correct answer
        // wherever the layout produces Latin letters. Only when it does not —
        // Cyrillic, Greek, Hebrew — fall back to the physical key. Checking
        // `code` unconditionally would swallow ⌘J on Dvorak, where the key in
        // the `KeyC` position types `j`.
        const isCopyKey =
          event.key.toLowerCase() === "c" ||
          (!/^[a-z]$/i.test(event.key) && event.code === "KeyC");
        if (!isCopyKey) return;
        const rect = api.cellSelections().at(0);
        if (!rect) return;
        // Take over from the browser: its native copy would run against an
        // empty DOM selection and leave the previous clipboard contents in
        // place, which pastes as stale data rather than as nothing.
        event.preventDefault();
        void api.exportData({ rect }).then(
          (exported) =>
            // Tab separated so a paste lands in spreadsheet cells, escaped the
            // same way as the CSV download — same free text, same spreadsheet.
            copyTextToClipboard(
              exported.data
                .map((row) =>
                  row.map((cell) => toDelimitedCell(cell, "\t")).join("\t"),
                )
                .join("\n"),
            ),
          // Nothing actionable to show from inside a key handler, but the
          // rejection must not surface as an unhandled promise.
          () => false,
        );
      },
    },
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

  const searchLabel = t({ en: "Search loaded titles", zh: "搜索已加载的作品" });
  const noMatchesLabel = t({
    en: "Nothing matches that search — try a different term.",
    zh: "没有匹配的结果，换个关键词试试。",
  });
  const columnsLabel = t({ en: "Columns", zh: "列" });
  const exportLabel = t({ en: "Export CSV", zh: "导出 CSV" });
  const loadMoreLabel = t({ en: "Load more", zh: "加载更多" });
  const loadingLabel = t({ en: "Loading more titles", zh: "正在加载更多" });
  const shownLabel = t({ en: "Shown", zh: "显示" });
  const loadedLabel = t({ en: "Loaded", zh: "已加载" });
  const endLabel = t({ en: "Everything loaded", zh: "已全部加载" });
  const hintLabel = t({
    en: "Drag to select cells, ⌘/Ctrl+C to copy, double-click a row to open it.",
    zh: "拖拽选择单元格，⌘/Ctrl+C 复制，双击行可打开详情。",
  });
  const tableLabel =
    mediaType === "tv"
      ? t({ en: "TV shows table", zh: "电视剧表格" })
      : t({ en: "Movies table", zh: "电影表格" });

  const numberFormat = new Intl.NumberFormat(locale);
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
      <div css={styles.panelContainer}>
        <section css={[corner.radius_3, styles.panel]} aria-label={tableLabel}>
          <div css={styles.toolbar}>
            <TextField
              label={searchLabel}
              labelHidden
              size="sm"
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
              }}
              placeholder={searchLabel}
              leading={<MagnifyingGlassIcon weight="bold" />}
              css={styles.search}
            />
            <div css={styles.toolbarActions}>
              <MenuButton
                popupRole="group"
                position="topRight"
                buttonProps={{
                  size: "sm",
                  icon: <SlidersHorizontalIcon weight="bold" />,
                  hideLabelOnMobile: true,
                }}
                menuContent={
                  <div css={styles.columnMenu}>
                    {columns.map((column) => (
                      <Checkbox
                        key={column.id}
                        size="sm"
                        label={column.name ?? column.id}
                        checked={!column.hide}
                        onChange={(e) => {
                          const visible = e.target.checked;
                          setColumns(
                            columns.map((candidate) =>
                              candidate.id === column.id
                                ? { ...candidate, hide: !visible }
                                : candidate,
                            ),
                          );
                        }}
                      />
                    ))}
                  </div>
                }
              >
                {columnsLabel}
              </MenuButton>
              <Button
                size="sm"
                icon={<DownloadSimpleIcon weight="bold" />}
                hideLabelOnMobile
                // Export reads the grid API, and the grid is unmounted while
                // the empty state is showing — there is nothing to export and
                // an enabled button would just swallow the click.
                disabled={visibleItems.length === 0}
                onClick={exportCsv}
              >
                {exportLabel}
              </Button>
            </div>
          </div>

          {visibleItems.length === 0 ? (
            <p css={styles.empty}>
              <span aria-hidden="true">🙉 </span>
              {query ? noMatchesLabel : notFoundLabel}
            </p>
          ) : (
            <div
              className="ln-grid"
              css={[styles.gridShell, styles.lyteNyteTheme]}
            >
              <Grid<MediaGridSpec>
                // Remounting on a new result set is what returns the viewport
                // to the first row and clears stale cell selections.
                key={resultsKey}
                ref={apiRef}
                rowSource={rowSource}
                columns={columns}
                onColumnsChange={setColumns}
                columnBase={{
                  resizable: true,
                  movable: true,
                  headerRenderer: MediaTableHeader,
                }}
                columnMarker={{
                  on: true,
                  width: 52,
                  cellRenderer: MediaRowNumberCell,
                  headerRenderer: MediaRowNumberHeader,
                }}
                rowHeight={ROW_HEIGHT}
                headerHeight={HEADER_HEIGHT}
                rowAlternateAttr
                rowAnimate={!prefersReducedMotion}
                cellSelectionMode="range"
                cellSelectionExcludeMarker
                columnDoubleClickToAutosize
                suppressScrollFlash
                viewportInitialHeight={520}
                viewportInitialWidth={1140}
                events={events}
                styles={gridPartStyles}
              />
            </div>
          )}

          <div css={styles.footer}>
            <p css={styles.counts}>
              {query && (
                <>
                  <span css={styles.countLabel}>{shownLabel}</span>
                  <span css={styles.countValue}>
                    {numberFormat.format(visibleItems.length)}
                  </span>
                </>
              )}
              <span css={styles.countLabel}>{loadedLabel}</span>
              <span css={styles.countValue}>
                {numberFormat.format(items.length)}
              </span>
            </p>
            <p css={styles.hint}>{hintLabel}</p>
            <div css={styles.footerActions}>
              {isFetchingNextPage && <Spinner size="sm" label={loadingLabel} />}
              {hasNextPage ? (
                <Button
                  size="sm"
                  onClick={loadMore}
                  disabled={isFetchingNextPage}
                >
                  {loadMoreLabel}
                </Button>
              ) : (
                <span css={styles.endNote}>{endLabel}</span>
              )}
            </div>
          </div>
        </section>
      </div>
    </MediaTableContext>
  );
}

// The panel draws its own border, so the viewport's would double up.
const gridPartStyles: Grid.Style = {
  viewport: { style: { border: "none" } },
};

const styles = stylex.create({
  // Matches the gutters `FiltersContainer` uses, so the panel's edges line up
  // with the filter bar above it.
  panelContainer: {
    maxInlineSize: layout.maxInlineSize,
    marginInline: "auto",
    marginBlockEnd: space._5,
    paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`,
    paddingRight: `calc(${space._3} + env(safe-area-inset-right))`,
  },
  panel: {
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    borderWidth: border.size_1,
    borderStyle: "solid",
    borderColor: color.neutralBorder,
    backgroundColor: color.bgSurface,
    boxShadow: shadow._3,
  },

  toolbar: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._2,
    paddingInline: space._3,
    borderBlockEndWidth: border.size_1,
    borderBlockEndStyle: "solid",
    borderBlockEndColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  search: {
    inlineSize: { default: "100%", [breakpoints.md]: space._15 },
  },
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    marginInlineStart: "auto",
  },
  columnMenu: {
    display: "flex",
    flexDirection: "column",
    gap: space._1,
    padding: space._1,
    minInlineSize: space._13,
  },

  gridShell: {
    // Tall enough to feel like a workspace, short enough that the page scroll
    // still reaches the footer on a laptop.
    blockSize: {
      default: "60dvh",
      [breakpoints.md]: "calc(100dvh - 18rem)",
    },
    minBlockSize: "24rem",
  },
  lyteNyteTheme: {
    // LyteNyte reads a small set of custom properties; mapping them onto the
    // app's tokens is all the theming the grid needs. Every token below is a
    // `light-dark()` value, so the grid follows the site's colour scheme with
    // no theme class of its own.
    "--ln-typeface": font.family,
    "--ln-font-md": font.uiBodySmall,
    "--ln-padding-horizontal-cell": space._2,
    "--ln-radius-field-md": border.radius_2,
    "--ln-bg-ui-panel": color.bgSurface,
    "--ln-bg-row-alternate": color.bgSurfaceSunken,
    "--ln-bg-row-hover": color.accentGlow,
    "--ln-bg-button-light": color.bgInteractiveRest,
    "--ln-border": color.neutralBorder,
    "--ln-border-row": color.neutralBorder,
    "--ln-border-strong": color.neutral,
    "--ln-border-xstrong": color.neutral,
    "--ln-text": color.textMuted,
    "--ln-text-dark": color.textMain,
    "--ln-primary-50": color.accent,
    "--ln-primary-10": color.surfaceAccentSubtle,
    "--ln-red-50": color.danger,
  },

  empty: {
    marginBlock: 0,
    paddingBlock: space._8,
    paddingInline: space._3,
    color: color.textMuted,
    textAlign: "center",
  },

  footer: {
    display: "flex",
    flexWrap: "wrap",
    alignItems: "center",
    gap: space._2,
    paddingBlock: space._1,
    paddingInline: space._3,
    borderBlockStartWidth: border.size_1,
    borderBlockStartStyle: "solid",
    borderBlockStartColor: color.neutralBorder,
    backgroundColor: color.bgSurfaceSunken,
  },
  counts: {
    display: "flex",
    alignItems: "baseline",
    gap: space._1,
    margin: 0,
  },
  countLabel: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
    letterSpacing: font.trackingWide,
    textTransform: "uppercase",
  },
  countValue: {
    color: color.textMain,
    fontSize: font.uiBodySmall,
    fontWeight: font.weight_6,
    fontVariantNumeric: "tabular-nums",
  },
  hint: {
    display: { default: "none", [breakpoints.lg]: "block" },
    margin: 0,
    color: color.textSubtle,
    fontSize: font.uiOverline,
  },
  footerActions: {
    display: "flex",
    alignItems: "center",
    gap: space._1,
    marginInlineStart: "auto",
  },
  endNote: {
    color: color.textSubtle,
    fontSize: font.uiOverline,
  },
});
