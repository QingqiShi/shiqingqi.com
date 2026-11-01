/**
 * What history import does with the old mail of a folder:
 * - `index`: the user filed it already, so its folder gives the category;
 * - `classify`: the model classifies it, through a batch;
 * - `recipients`: a sent folder, read for the addresses the user wrote to;
 * - `skip`: drafts, junk, trash, and the folders that repeat other folders.
 */
export type HistoryMode = "index" | "classify" | "recipients" | "skip";

export function isInbox(path: string) {
  return path.toUpperCase() === "INBOX";
}

export function historyModeOf(folder: {
  path: string;
  specialUse: string | null;
  categoryId: string | null;
}): HistoryMode {
  if (folder.categoryId !== null) return "index";
  if (isInbox(folder.path)) return "classify";
  if (folder.specialUse === "\\Sent") return "recipients";
  return folder.specialUse === null ? "classify" : "skip";
}

const MODE_ORDER: Record<HistoryMode, number> = {
  index: 0,
  recipients: 1,
  classify: 2,
  skip: 3,
};

/**
 * Filed folders go first: a mail that is in two folders, as with Gmail
 * labels, is then indexed and not sent to the model. The inbox goes first of
 * the folders to classify.
 */
export function compareHistoryOrder(
  a: { path: string; mode: HistoryMode },
  b: { path: string; mode: HistoryMode },
) {
  return (
    MODE_ORDER[a.mode] - MODE_ORDER[b.mode] ||
    Number(isInbox(b.path)) - Number(isInbox(a.path)) ||
    a.path.localeCompare(b.path)
  );
}
