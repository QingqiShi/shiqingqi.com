import { eq, inArray, notExists, sql } from "drizzle-orm";
import { mailCategories, mailFolders } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";

export const CATEGORY_NAME_MAX = 60;

export interface FolderAssignment {
  folderId: string;
  /** The category's name, or null when the folder is no category. */
  category: string | null;
}

export class CategoryMappingError extends Error {
  readonly code: "unknown-folder" | "duplicate-category";
  readonly detail: string;

  constructor(code: CategoryMappingError["code"], detail: string) {
    super(`${code}: ${detail}`);
    this.name = "CategoryMappingError";
    this.code = code;
    this.detail = detail;
  }
}

function normaliseName(name: string | null) {
  const trimmed = name?.replace(/\s+/g, " ").trim().slice(0, CATEGORY_NAME_MAX);
  return trimmed || null;
}

/**
 * Applies the user's choice of which folders are categories. Folders with
 * the same category name share one category, also across accounts, where
 * the folders may have other names. One account files a category into one
 * folder only, so two folders of one account cannot share a name. Folders
 * not in `assignments` keep their category; a category with no folder left
 * is removed.
 */
export async function saveCategoryMapping(
  { db, userId }: UserScope,
  assignments: readonly FolderAssignment[],
): Promise<void> {
  const folders = await db
    .select({
      id: mailFolders.id,
      accountId: mailFolders.accountId,
      category: mailCategories.name,
    })
    .from(mailFolders)
    .leftJoin(mailCategories, eq(mailCategories.id, mailFolders.categoryId));
  const byId = new Map(folders.map((folder) => [folder.id, folder]));

  const wanted = new Map(folders.map((folder) => [folder.id, folder.category]));
  for (const { folderId, category } of assignments) {
    if (!byId.has(folderId)) {
      throw new CategoryMappingError("unknown-folder", folderId);
    }
    wanted.set(folderId, normaliseName(category));
  }

  const seen = new Set<string>();
  for (const [folderId, category] of wanted) {
    if (category === null) continue;
    const key = `${byId.get(folderId)?.accountId ?? ""}\u0000${category.toLowerCase()}`;
    if (seen.has(key))
      throw new CategoryMappingError("duplicate-category", category);
    seen.add(key);
  }

  const names = [
    ...new Set([...wanted.values()].filter((name) => name !== null)),
  ];
  if (names.length > 0) {
    await db
      .insert(mailCategories)
      .values(names.map((name) => ({ userId, name })))
      .onConflictDoNothing({
        target: [mailCategories.userId, mailCategories.name],
      });
  }
  const categories =
    names.length > 0
      ? await db
          .select({ id: mailCategories.id, name: mailCategories.name })
          .from(mailCategories)
          .where(inArray(mailCategories.name, names))
      : [];
  const idOf = new Map(
    categories.map((category) => [category.name, category.id]),
  );

  const changed = [...wanted].filter(
    ([folderId, category]) => byId.get(folderId)?.category !== category,
  );
  if (changed.length > 0) {
    // First clear, then set: a swap of two folders' categories in one
    // account would otherwise break the one-folder-per-account index halfway.
    await db
      .update(mailFolders)
      .set({ categoryId: null })
      .where(
        inArray(
          mailFolders.id,
          changed.map(([folderId]) => folderId),
        ),
      );
    for (const [folderId, category] of changed) {
      if (category === null) continue;
      await db
        .update(mailFolders)
        .set({ categoryId: idOf.get(category) ?? null })
        .where(eq(mailFolders.id, folderId));
    }
  }

  await db.delete(mailCategories).where(
    notExists(
      db
        .select({ one: sql`1` })
        .from(mailFolders)
        .where(eq(mailFolders.categoryId, mailCategories.id)),
    ),
  );
}
