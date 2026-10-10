import { importId } from "./import-id.ts";
import type { OwnerKey } from "./split-owner-prefix.ts";
import type { CategoryRow } from "./types.ts";
import type { MapOptions } from "./types.ts";
import type { SourceCategory, SourceData } from "./types.ts";

export interface CategoryInfo {
  /** Null for a transfer category: transfers carry no category. */
  id: string | null;
  kind: "expense" | "income" | "transfer";
  /** MoneyThings leaves it out of statistics (退款). */
  notCounted: boolean;
  /** 老公消费 and 老婆消费 say who spent. */
  member: OwnerKey | null;
}

export interface MappedCategories {
  rows: CategoryRow[];
  bySourceId: Map<string, CategoryInfo>;
  /** Rows to keep only when a transaction still uses them (退款). */
  optionalIds: Set<string>;
  /** MoneyThings' "other" income primary (其他), for income no other category fits. */
  otherIncomeId: string | null;
}

const OTHER_INCOME = "其他";

const MEMBER_CATEGORIES: Record<string, OwnerKey> = {
  老公消费: "husband",
  老婆消费: "wife",
};

function primaryKind(primary: SourceCategory): CategoryInfo["kind"] {
  if (primary.type === "Expenditure") return "expense";
  if (primary.type === "Income") return "income";
  if (primary.type === "Transfer") return "transfer";
  throw new Error(`Unknown category type ${String(primary.type)}`);
}

/**
 * The category tree. Transfer categories are dropped; a not-counted income
 * primary (退款) is kept only when a transaction still uses it.
 */
export function mapCategories(
  source: SourceData,
  options: MapOptions,
): MappedCategories {
  const byPk = new Map(source.categories.map((c) => [c.pk, c]));
  const rows: CategoryRow[] = [];
  const bySourceId = new Map<string, CategoryInfo>();
  const optionalIds = new Set<string>();
  let otherIncomeId: string | null = null;

  const primaryOf = (category: SourceCategory): SourceCategory => {
    const parent =
      category.parentPk === null ? undefined : byPk.get(category.parentPk);
    return parent ? primaryOf(parent) : category;
  };

  const ordered = [...source.categories].sort(
    (a, b) => a.entity - b.entity || a.order - b.order || a.pk - b.pk,
  );
  for (const category of ordered) {
    const primary = primaryOf(category);
    const kind = primaryKind(primary);
    const notCounted = category.notCounted || primary.notCounted;
    const id = kind === "transfer" ? null : importId("category", category.id);
    bySourceId.set(category.id, {
      id,
      kind,
      notCounted,
      member: MEMBER_CATEGORIES[category.name] ?? null,
    });
    if (id === null || kind === "transfer") continue;
    const parent =
      category.parentPk === null ? undefined : byPk.get(category.parentPk);
    rows.push({
      id,
      householdId: options.householdId,
      parentId: parent ? importId("category", parent.id) : null,
      kind,
      name: category.name,
      emoji: category.emoji,
      color: category.color,
      position: category.order,
      archivedAt: category.noLongerUsed ? options.importedAt : null,
      version: 0,
    });
    if (notCounted) optionalIds.add(id);
    if (
      kind === "income" &&
      parent === undefined &&
      !notCounted &&
      category.name === OTHER_INCOME
    ) {
      otherIncomeId ??= id;
    }
  }
  return { rows, bySourceId, optionalIds, otherIncomeId };
}
