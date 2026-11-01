import type { MailProvider } from "#src/assistant/db/schema.ts";
import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";

/** Folders whose mail the owner wrote, threw away, or that only show mail of other folders again. */
const SKIPPED_SPECIAL_USES = new Set([
  "\\Sent",
  "\\Drafts",
  "\\Trash",
  "\\Junk",
  "\\All",
  "\\Flagged",
  "\\Important",
]);

/**
 * The folders the morning report reads. Gmail keeps each mail once in All
 * Mail and shows it again in a folder for each label, so only All Mail is
 * read there. Other servers keep each mail in one folder, so every
 * selectable folder is read except the ones above, the inbox included.
 */
export function reportFolders(
  provider: MailProvider,
  folders: readonly MailboxFolder[],
): string[] {
  const selectable = folders.filter((folder) => folder.selectable);
  if (provider === "gmail") {
    const allMail = selectable.find((folder) => folder.specialUse === "\\All");
    if (allMail) return [allMail.path];
  }
  return selectable
    .filter(
      (folder) =>
        folder.specialUse === null ||
        !SKIPPED_SPECIAL_USES.has(folder.specialUse),
    )
    .map((folder) => folder.path);
}
