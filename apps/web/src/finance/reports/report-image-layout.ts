export const REPORT_IMAGE_WIDTH = 1600;
export const IMAGE_PADDING = 64;
export const IMAGE_CONTENT_WIDTH = REPORT_IMAGE_WIDTH - IMAGE_PADDING * 2;
export const IMAGE_COLUMN_GAP = 56;
export const IMAGE_COLUMN_WIDTH = (IMAGE_CONTENT_WIDTH - IMAGE_COLUMN_GAP) / 2;

export const IMAGE_TITLE_LINE_HEIGHT = 28;
/** The space between the title line and the net worth. */
export const IMAGE_HERO_GAP = 36;
/** The "Net worth" label, the gap under it, and the net worth. */
export const IMAGE_HERO_HEIGHT = 120;
const IMAGE_HEADER_HEIGHT =
  IMAGE_TITLE_LINE_HEIGHT + IMAGE_HERO_GAP + IMAGE_HERO_HEIGHT;
/** The net-worth trend with its date labels. */
export const IMAGE_TREND_HEIGHT = 440;
const IMAGE_BLOCK_GAP = 44;
/** The space between a section's rule and its title. */
export const IMAGE_RULE_GAP = 36;
/** A section title and the space under it. */
export const IMAGE_TITLE_HEIGHT = 58;
export const IMAGE_GROUP_GAP = 48;
export const IMAGE_GROUP_HEIGHT = 200;
export const IMAGE_GROUP_ROW_GAP = 40;
/** The spending title and the line under it, above the week bars. */
export const IMAGE_WEEK_BARS_TOP = 94;
export const IMAGE_WEEK_BARS_HEIGHT = 150;
/** The labels under the week bars. */
const IMAGE_WEEK_LABELS_HEIGHT = 34;
const IMAGE_WEEKS_HEIGHT =
  IMAGE_WEEK_BARS_TOP + IMAGE_WEEK_BARS_HEIGHT + IMAGE_WEEK_LABELS_HEIGHT;
export const IMAGE_CATEGORY_ROW_HEIGHT = 28;
export const IMAGE_CATEGORY_ROW_GAP = 14;
/** The most categories the spending lists. */
export const IMAGE_CATEGORIES = 6;

/**
 * Three or four tiles a row, whichever fills the last row more, so that a
 * Group is rarely alone on its row.
 */
function groupColumns(groups: number) {
  const fill = (columns: number) => {
    const last = groups % columns;
    return (last === 0 ? columns : last) / columns;
  };
  return fill(4) > fill(3) ? 4 : 3;
}

interface ReportImageLayout {
  height: number;
  /** Null when the Report has no trend to draw. */
  trendTop: number | null;
  /** Null when no Group has a balance. */
  groupsTop: number | null;
  groupColumns: number;
  groupWidth: number;
  spendingTop: number;
}

function section(height: number) {
  return IMAGE_BLOCK_GAP + IMAGE_RULE_GAP + height;
}

/**
 * Where the blocks of the share image go, top to bottom: the header, the
 * net-worth trend, the Groups in rows of three or four, and the spending. The image is as tall as its blocks.
 */
export function reportImageLayout({
  hasTrend,
  groups,
  categories,
}: {
  hasTrend: boolean;
  /** Groups that get a tile. */
  groups: number;
  /** Categories the spending lists, at most `IMAGE_CATEGORIES`. */
  categories: number;
}): ReportImageLayout {
  let top = IMAGE_PADDING + IMAGE_HEADER_HEIGHT;
  let trendTop = null;
  if (hasTrend) {
    trendTop = top + IMAGE_BLOCK_GAP;
    top = trendTop + IMAGE_TREND_HEIGHT;
  }
  let groupsTop = null;
  const columns = groupColumns(groups);
  const rows = Math.ceil(groups / columns);
  if (rows > 0) {
    const tiles = rows * IMAGE_GROUP_HEIGHT + (rows - 1) * IMAGE_GROUP_ROW_GAP;
    groupsTop = top + IMAGE_BLOCK_GAP + IMAGE_RULE_GAP;
    top += section(IMAGE_TITLE_HEIGHT + tiles);
  }
  const listed = Math.max(categories, 1);
  const categoryList =
    IMAGE_TITLE_HEIGHT +
    listed * IMAGE_CATEGORY_ROW_HEIGHT +
    (listed - 1) * IMAGE_CATEGORY_ROW_GAP;
  const spendingTop = top + IMAGE_BLOCK_GAP + IMAGE_RULE_GAP;
  top += section(Math.max(IMAGE_WEEKS_HEIGHT, categoryList));
  return {
    height: top + IMAGE_PADDING,
    trendTop,
    groupsTop,
    groupColumns: columns,
    groupWidth:
      (IMAGE_CONTENT_WIDTH - IMAGE_GROUP_GAP * (columns - 1)) / columns,
    spendingTop,
  };
}
