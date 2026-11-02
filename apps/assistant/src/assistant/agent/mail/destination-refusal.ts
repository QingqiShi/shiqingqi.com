import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";

/**
 * Folders an agent never moves mail into: a move to Trash is a delete, mail
 * in Sent and Drafts is the owner's own, and the virtual folders only show
 * mail of other folders again. Junk is allowed.
 */
const CLOSED_DESTINATIONS = new Set([
  "\\Trash",
  "\\Sent",
  "\\Drafts",
  "\\All",
  "\\Flagged",
  "\\Important",
]);

/**
 * Virtual folders, which an agent never moves mail out of: in Gmail a move
 * out of All Mail or Starred changes labels, not a folder.
 */
const VIRTUAL = new Set(["\\All", "\\Flagged", "\\Important"]);

const MAX_NEW_FOLDER_CHARS = 40;

export function isInbox(folder: Pick<MailboxFolder, "path">) {
  return folder.path.toUpperCase() === "INBOX";
}

/** Why mail may not go into `folder`, or null when it may. */
export function destinationRefusal(folder: MailboxFolder): string | null {
  if (!folder.selectable) return `"${folder.path}" only holds other folders.`;
  if (folder.specialUse && CLOSED_DESTINATIONS.has(folder.specialUse)) {
    return `Mail never goes into "${folder.path}" (${folder.specialUse}).`;
  }
  return null;
}

/** Why mail may not leave `folder`, or null when it may. */
export function sourceRefusal(folder: MailboxFolder): string | null {
  if (folder.specialUse && VIRTUAL.has(folder.specialUse)) {
    return `Mail is never moved out of the virtual folder "${folder.path}".`;
  }
  return null;
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
