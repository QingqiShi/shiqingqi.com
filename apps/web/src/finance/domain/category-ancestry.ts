/** A Category and its parents, the top one first. A loop in the parents stops the walk. */
export function categoryAncestry<
  Category extends { id: string; parentId: string | null },
>(categoryId: string, byId: ReadonlyMap<string, Category>): Category[] {
  const path: Category[] = [];
  const seen = new Set<string>();
  let current = byId.get(categoryId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    path.unshift(current);
    current =
      current.parentId === null ? undefined : byId.get(current.parentId);
  }
  return path;
}
