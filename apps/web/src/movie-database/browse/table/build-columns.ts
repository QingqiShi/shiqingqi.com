import { MediaGenresCell } from "./media-genres-cell";
import { MediaLanguageCell } from "./media-language-cell";
import { MediaOverviewCell } from "./media-overview-cell";
import { MediaPopularityCell } from "./media-popularity-cell";
import { MediaReleaseDateCell } from "./media-release-date-cell";
import { MediaScoreCell } from "./media-score-cell";
import { MediaTitleCell } from "./media-title-cell";
import { MediaVotesCell } from "./media-votes-cell";
import type { MediaColumn } from "./types";

export interface ColumnLabels {
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

export function buildColumns({
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
export function withUserColumnState(
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
