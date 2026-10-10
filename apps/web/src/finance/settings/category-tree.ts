import type { CategoryRow } from "../sync/row-schemas.ts";

interface CategoryNode {
  category: CategoryRow;
  depth: number;
}

/**
 * The Categories of one kind as a flat list in tree order: each parent, then
 * its children, by position then name. A child whose parent is gone shows at
 * the top level, so nothing is lost.
 */
export function categoryTree(
  categories: readonly CategoryRow[],
  kind: CategoryRow["kind"],
): CategoryNode[] {
  const ofKind = categories.filter((category) => category.kind === kind);
  const ids = new Set(ofKind.map((category) => category.id));
  const children = new Map<string | null, CategoryRow[]>();
  for (const category of ofKind) {
    const parent =
      category.parentId !== null && ids.has(category.parentId)
        ? category.parentId
        : null;
    const list = children.get(parent) ?? [];
    list.push(category);
    children.set(parent, list);
  }
  const out: CategoryNode[] = [];
  const visit = (parent: string | null, depth: number) => {
    for (const category of children.get(parent) ?? []) {
      out.push({ category, depth });
      visit(category.id, depth + 1);
    }
  };
  visit(null, 0);
  return out;
}
