import type { AnalyticsIndex } from "./types.ts";

/** The id of Category index `category`, or null for no Category. */
export function categoryIdOf(
  index: AnalyticsIndex,
  category: number,
): string | null {
  return category >= 0 && category < index.categoryIds.length
    ? index.categoryIds[category]
    : null;
}
