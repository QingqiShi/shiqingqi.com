import { and, eq, notInArray, sql } from "drizzle-orm";
import { mailFolders } from "#src/assistant/db/schema.ts";
import type { UserScope } from "#src/assistant/db/with-user.ts";
import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";

export type FolderRow = typeof mailFolders.$inferSelect;

/**
 * Makes the stored folders of an account match the server: new ones added,
 * names and counts updated, vanished ones removed. Keeps each folder's
 * category and cursor. A folder that only holds folders is not stored.
 */
export async function saveFolders(
  { db, userId }: UserScope,
  accountId: string,
  listed: readonly MailboxFolder[],
  now: Date,
): Promise<FolderRow[]> {
  const selectable = listed.filter((folder) => folder.selectable);
  if (selectable.length > 0) {
    await db
      .insert(mailFolders)
      .values(
        selectable.map((folder) => ({
          userId,
          accountId,
          path: folder.path,
          name: folder.name,
          delimiter: folder.delimiter,
          specialUse: folder.specialUse,
          messageCount: folder.messages,
          unseenCount: folder.unseen,
          countedAt: now,
        })),
      )
      .onConflictDoUpdate({
        target: [mailFolders.accountId, mailFolders.path],
        set: {
          name: sql`excluded.name`,
          delimiter: sql`excluded.delimiter`,
          specialUse: sql`excluded.special_use`,
          messageCount: sql`excluded.message_count`,
          unseenCount: sql`excluded.unseen_count`,
          countedAt: sql`excluded.counted_at`,
        },
      });
  }
  await db.delete(mailFolders).where(
    and(
      eq(mailFolders.accountId, accountId),
      selectable.length > 0
        ? notInArray(
            mailFolders.path,
            selectable.map((folder) => folder.path),
          )
        : undefined,
    ),
  );
  return db
    .select()
    .from(mailFolders)
    .where(eq(mailFolders.accountId, accountId));
}
