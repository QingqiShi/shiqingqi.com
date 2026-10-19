export const REPORT_IMAGE_WIDTH = 1600;
export const IMAGE_PADDING = 64;
const IMAGE_CONTENT_WIDTH = REPORT_IMAGE_WIDTH - IMAGE_PADDING * 2;
export const IMAGE_COLUMN_GAP = 56;
export const IMAGE_LEFT_WIDTH = 740;
export const IMAGE_RIGHT_WIDTH =
  IMAGE_CONTENT_WIDTH - IMAGE_LEFT_WIDTH - IMAGE_COLUMN_GAP;

export const IMAGE_HEADER_HEIGHT = 128;
export const IMAGE_HEADER_GAP = 40;
export const IMAGE_BLOCK_GAP = 48;
/** A section title and the space under it. */
export const IMAGE_TITLE_HEIGHT = 52;
export const IMAGE_TABLE_ROW_HEIGHT = 40;
export const IMAGE_GROUP_NET_ROW_HEIGHT = 40;
export const IMAGE_DONUT_HEIGHT = 300;
/** The spending title and the line of facts under it. */
export const IMAGE_SPENDING_HEAD_HEIGHT = 110;
/** The week bars and their legend, beside the categories. */
export const IMAGE_WEEK_BARS_BLOCK_HEIGHT = 190;
/** A ranked line (a name, an amount and a bar) and the gap under it. */
export const IMAGE_RANKED_ROW_HEIGHT = 54;
export const IMAGE_RANKED_ROW_GAP = 12;
export const IMAGE_TREND_MIN_HEIGHT = 340;
/** Taller than this, the trend reads as a stretched line. */
export const IMAGE_TREND_MAX_HEIGHT = 600;
/** The categories the spending always shows, when the week has them. */
const IMAGE_BASE_CATEGORIES = 4;

interface ReportImageLayout {
  height: number;
  /** The column that holds the week's spending, under the balance sheet or under the group nets. */
  spendingColumn: "left" | "right";
  trendHeight: number;
  groupNetsHeight: number;
  spendingHeight: number;
  /** The categories the spending lists. */
  categories: number;
  /** The top payees listed under the spending; 0 for none. */
  payees: number;
}

function rankedListHeight(rows: number) {
  return rows * IMAGE_RANKED_ROW_HEIGHT - IMAGE_RANKED_ROW_GAP;
}

function spendingHeight(categories: number) {
  return (
    IMAGE_SPENDING_HEAD_HEIGHT +
    Math.max(IMAGE_WEEK_BARS_BLOCK_HEIGHT, rankedListHeight(categories))
  );
}

/** The top payees block with `rows` lines, and the gap above it. */
function payeesHeight(rows: number) {
  return rows === 0
    ? 0
    : IMAGE_BLOCK_GAP + IMAGE_TITLE_HEIGHT + rankedListHeight(rows);
}

/**
 * The size of the share image and where its blocks go. The balance sheet
 * fills the left column and grows with its rows; the spending goes to the
 * column that makes the image shorter. The space that the column with the
 * spending has left goes to the trend up to `IMAGE_TREND_MAX_HEIGHT`, then
 * to more categories, then to the top payees, and the rest to the trend, so
 * that both columns end on one line.
 */
export function reportImageLayout({
  tableRows,
  groupNets,
  categories,
  payees,
}: {
  /** Rows of the balance sheet under its column titles. */
  tableRows: number;
  groupNets: number;
  /** Categories with spending in the week. */
  categories: number;
  payees: number;
}): ReportImageLayout {
  const table = IMAGE_TITLE_HEIGHT + IMAGE_TABLE_ROW_HEIGHT * (tableRows + 1);
  const groupNetsHeight =
    IMAGE_TITLE_HEIGHT +
    Math.max(groupNets * IMAGE_GROUP_NET_ROW_HEIGHT, IMAGE_DONUT_HEIGHT);
  const baseCategories = Math.min(categories, IMAGE_BASE_CATEGORIES);
  const rightFixed = IMAGE_TREND_MIN_HEIGHT + IMAGE_BLOCK_GAP + groupNetsHeight;
  const spending = IMAGE_BLOCK_GAP + spendingHeight(baseCategories);
  const spendingLeft = Math.max(table + spending, rightFixed);
  const spendingRight = Math.max(table, rightFixed + spending);
  const spendingColumn = spendingLeft <= spendingRight ? "left" : "right";
  const body = Math.min(spendingLeft, spendingRight);

  let spare =
    body - (spendingColumn === "left" ? table : rightFixed) - spending;
  let trendGrowth = 0;
  if (spendingColumn === "right") {
    trendGrowth = Math.min(
      spare,
      IMAGE_TREND_MAX_HEIGHT - IMAGE_TREND_MIN_HEIGHT,
    );
    spare -= trendGrowth;
  }
  let shownCategories = baseCategories;
  while (
    shownCategories < categories &&
    spendingHeight(shownCategories + 1) - spendingHeight(baseCategories) <=
      spare
  ) {
    shownCategories++;
  }
  spare -= spendingHeight(shownCategories) - spendingHeight(baseCategories);
  let shownPayees = payees;
  while (shownPayees > 0 && payeesHeight(shownPayees) > spare) shownPayees--;
  // A list of one or two payees out of five says little. Then give the space to the trend.
  if (shownPayees < Math.min(payees, 3)) shownPayees = 0;
  spare -= payeesHeight(shownPayees);

  return {
    height: IMAGE_PADDING * 2 + IMAGE_HEADER_HEIGHT + IMAGE_HEADER_GAP + body,
    spendingColumn,
    trendHeight:
      spendingColumn === "right"
        ? IMAGE_TREND_MIN_HEIGHT + trendGrowth + spare
        : body - IMAGE_BLOCK_GAP - groupNetsHeight,
    groupNetsHeight,
    spendingHeight: spendingHeight(shownCategories),
    categories: shownCategories,
    payees: shownPayees,
  };
}
