import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";

/** Folders that hold mail of the mail client itself, never a kind of mail. `\Archive` is allowed. */
const EXCLUDED_SPECIAL_USE = new Set([
  "\\Sent",
  "\\Drafts",
  "\\Trash",
  "\\Junk",
  "\\All",
  "\\Flagged",
  "\\Important",
]);

const MAX_NEW_FOLDER_CHARS = 40;

export function isInbox(folder: Pick<MailboxFolder, "path">) {
  return folder.path.toUpperCase() === "INBOX";
}

/** The folders that inbox mail can be filed into, by path. */
export function candidateFolders(folders: readonly MailboxFolder[]): string[] {
  return folders
    .filter(
      (folder) =>
        folder.selectable &&
        !isInbox(folder) &&
        !(folder.specialUse && EXCLUDED_SPECIAL_USE.has(folder.specialUse)),
    )
    .map((folder) => folder.path);
}

/** The hierarchy delimiter of the mailbox, such as "/" or ".". */
export function delimiterOf(folders: readonly MailboxFolder[]): string | null {
  return (
    folders.find(isInbox)?.delimiter ??
    folders.find((folder) => folder.delimiter !== null)?.delimiter ??
    null
  );
}

/**
 * The name of a new top-level folder from what the model wrote: no control
 * characters, no hierarchy delimiter and no IMAP wildcards, one space between
 * words, at most 40 characters. Null when nothing is left.
 */
export function newFolderName(
  raw: string,
  delimiter: string | null,
): string | null {
  let name = raw.replace(/[\p{Cc}*%]/gu, " ");
  if (delimiter) name = name.replaceAll(delimiter, " ");
  name = name.replace(/\s+/g, " ").trim();
  name = Array.from(new Intl.Segmenter().segment(name), (part) => part.segment)
    .slice(0, MAX_NEW_FOLDER_CHARS)
    .join("")
    .trim();
  return name === "" ? null : name;
}

function matchKey(name: string) {
  return name.normalize("NFKC").toLowerCase().replace(/\s+/g, "");
}

/**
 * The folder that a new name stands for already, when its path or its own
 * name is the same but for case and spaces: "my bills" finds "My Bills".
 */
export function findFolderNamed(
  name: string,
  folders: readonly MailboxFolder[],
): MailboxFolder | null {
  const key = matchKey(name);
  return (
    folders.find((folder) => matchKey(folder.path) === key) ??
    folders.find((folder) => matchKey(folder.name) === key) ??
    null
  );
}
