import type { CategoryRow } from "../sync/row-schemas.ts";

/** The words a screen shows for the system Categories, from `t()` in render. */
export interface SystemCategoryNames {
  uncategorised: string;
}

/**
 * The name to show for a Category. A system Category (Uncategorised) keeps
 * an English name in the database, so it shows the translated word instead.
 */
export function categoryDisplayName(
  category: Pick<CategoryRow, "name" | "isSystem">,
  names: SystemCategoryNames,
): string {
  return category.isSystem ? names.uncategorised : category.name;
}

/** The name to show for a line on a Category, such as a Report's spending line. A line with no Category is "Uncategorised" too. */
export function categoryLineName(
  line: Pick<CategoryRow, "name" | "isSystem"> & { id: string | null },
  names: SystemCategoryNames,
): string {
  return line.id === null
    ? names.uncategorised
    : categoryDisplayName(line, names);
}
