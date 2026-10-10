import { t } from "#src/i18n.ts";
import type { CategoryRow } from "../sync/row-schemas.ts";
import {
  categoryDisplayName,
  type SystemCategoryNames,
} from "./category-display-name.ts";

/** The translated system Category names, for code outside render that calls `categoryDisplayName`. */
// eslint-disable-next-line @eslint-react/no-unnecessary-use-prefix -- the i18n transform adds a useI18nTranslations hook call to each function that calls t(), so the prefix is earned; the rule only sees the pre-transform source
export function useSystemCategoryNames(): SystemCategoryNames {
  return { uncategorised: t({ en: "Uncategorised", zh: "未分类" }) };
}

/** Names a Category for display; a system Category shows "Uncategorised" in the visitor's language. */
export function useCategoryDisplayName() {
  const names = useSystemCategoryNames();
  return (category: Pick<CategoryRow, "name" | "isSystem">) =>
    categoryDisplayName(category, names);
}
