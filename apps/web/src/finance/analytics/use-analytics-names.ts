import { t } from "#src/i18n.ts";
import { useReplica } from "../replica/use-replica.ts";
import { categoryDisplayName } from "../store/category-display-name.ts";
import { useSystemCategoryNames } from "../store/use-category-display-name.ts";

/** Names for the ids an analytics view holds, deleted rows included: old Transactions still point at them. */
export function useAnalyticsNames() {
  const categories = useReplica((snapshot) => snapshot.tables.categories);
  const payees = useReplica((snapshot) => snapshot.tables.payees);
  const tags = useReplica((snapshot) => snapshot.tables.tags);
  const systemNames = useSystemCategoryNames();
  const uncategorisedIncome = t({
    en: "Uncategorised income",
    zh: "未分类收入",
  });
  return {
    category: (id: string) => {
      const row = categories.get(id);
      if (!row) return { name: "…", emoji: "" };
      const name =
        row.isSystem && row.kind === "income"
          ? uncategorisedIncome
          : categoryDisplayName(row, systemNames);
      return { name, emoji: row.emoji };
    },
    payee: (id: string) => payees.get(id)?.name ?? "…",
    tag: (id: string) => tags.get(id)?.name ?? "…",
  };
}
