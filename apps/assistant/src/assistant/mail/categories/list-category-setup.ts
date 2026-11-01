import { asc, eq, sql } from "drizzle-orm";
import {
  mailAccounts,
  mailCategories,
  mailFolders,
} from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";

/** The category setup page: every account with its folders, counts and categories. */
export async function listCategorySetup({ db }: UserScope) {
  const accounts = await db
    .select({
      id: mailAccounts.id,
      provider: mailAccounts.provider,
      address: mailAccounts.address,
    })
    .from(mailAccounts)
    .orderBy(asc(mailAccounts.createdAt));
  const folders = await db
    .select({
      id: mailFolders.id,
      accountId: mailFolders.accountId,
      path: mailFolders.path,
      specialUse: mailFolders.specialUse,
      messageCount: mailFolders.messageCount,
      unseenCount: mailFolders.unseenCount,
      category: mailCategories.name,
    })
    .from(mailFolders)
    .leftJoin(mailCategories, eq(mailCategories.id, mailFolders.categoryId))
    .orderBy(
      sql`upper(${mailFolders.path}) = 'INBOX' desc`,
      asc(mailFolders.path),
    );
  return accounts.map((account) => ({
    ...account,
    folders: folders
      .filter((folder) => folder.accountId === account.id)
      .map((folder) => ({
        ...folder,
        // The inbox and the folders the server keeps (sent, trash, …) are never categories.
        canBeCategory:
          folder.specialUse === null && folder.path.toUpperCase() !== "INBOX",
      })),
  }));
}

export type CategorySetupAccount = Awaited<
  ReturnType<typeof listCategorySetup>
>[number];
