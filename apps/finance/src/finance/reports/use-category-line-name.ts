import { categoryLineName } from "../store/category-display-name.ts";
import { useSystemCategoryNames } from "../store/use-category-display-name.ts";
import type { SpendingLine } from "./weekly-report-data-schema.ts";

/** The name of a Report's Category line in the reader's language. */
export function useCategoryLineName(): (line: SpendingLine) => string {
  const names = useSystemCategoryNames();
  return (line) => categoryLineName(line, names);
}
