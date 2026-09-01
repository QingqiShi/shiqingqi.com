import type { Grid } from "@1771technologies/lytenyte-pro";
import type { MediaListItem } from "#src/utils/media-list-item.ts";

export type MediaSortDirection = "asc" | "desc";

/**
 * Extra per-column properties the table adds on top of LyteNyte's own.
 *
 * LyteNyte has no built-in sort state: the grid owns column layout, the app
 * owns what "sorted" means. Keeping the direction on the column is the
 * documented pattern — the header renderer reads it, and the data source turns
 * it into a sort dimension.
 */
export interface MediaColumnExtras {
  readonly sort?: MediaSortDirection;
  /** Opt a column out of the sortable header affordance. */
  readonly unsortable?: boolean;
  /**
   * Locale-aware comparator, used instead of the default `<`/`>` on the field
   * value. Only worth it for prose columns — `<` compares UTF-16 code units,
   * which orders Chinese titles by codepoint rather than by pinyin.
   */
  readonly comparator?: (left: MediaListItem, right: MediaListItem) => number;
}

// Note: no `api` key. `Grid.API` intersects `Spec["api"]` into the API object,
// so declaring it as `undefined` collapses the whole API type to `never`.
export interface MediaTableSpec {
  readonly data: MediaListItem;
  readonly column: MediaColumnExtras;
}

export type MediaColumn = Grid.Column<MediaTableSpec>;
export type MediaCellParams = Grid.T.CellRendererParams<MediaTableSpec>;
export type MediaHeaderParams = Grid.T.HeaderParams<MediaTableSpec>;
