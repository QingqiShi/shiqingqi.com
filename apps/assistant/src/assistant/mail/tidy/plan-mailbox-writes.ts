import type { MailBucket } from "#src/assistant/db/schema.ts";

export const SEEN = "\\Seen";
export const FLAGGED = "\\Flagged";

/** One classified mail as a write run sees it. */
export interface WriteCandidate {
  bucket: MailBucket;
  /** The user marked it done or not important. */
  closed: boolean;
  /** A digest was built after the mail was classified, so the mail was in it. */
  shownInDigest: boolean;
  /** The mail is in its account's inbox, where sync found it. */
  inInbox: boolean;
  /** The path of the classification's category folder in the mail's account, or null. */
  categoryFolderPath: string | null;
  /** What the app already did to the mail. */
  seen: boolean;
  flagged: boolean;
}

export interface WritePlan {
  setSeen: boolean;
  setFlagged: boolean;
  clearFlagged: boolean;
  /** The folder to move the mail to, or null to leave it where it is. */
  moveTo: string | null;
  /** Once the plan is done, nothing will change for the mail again. */
  final: boolean;
}

/**
 * What the app does to a mail it classified:
 *
 * - every mail is marked read;
 * - open `act` and `unsure` mail is flagged and stays in the inbox;
 * - `filed` mail, `fyi` mail that was in a digest, and closed mail leave the
 *   inbox for their category's folder, unflagged; with no folder for the
 *   category in that account, the mail stays in the inbox, read.
 *
 * The app clears only a flag it set, and moves mail only out of the inbox.
 */
export function planMailboxWrites(mail: WriteCandidate): WritePlan {
  const needsUser =
    !mail.closed && (mail.bucket === "act" || mail.bucket === "unsure");
  const leavesInbox =
    mail.closed ||
    mail.bucket === "filed" ||
    (mail.bucket === "fyi" && mail.shownInDigest);
  return {
    setSeen: !mail.seen,
    setFlagged: needsUser && !mail.flagged,
    clearFlagged: !needsUser && mail.flagged,
    moveTo:
      leavesInbox && mail.inInbox && mail.categoryFolderPath
        ? mail.categoryFolderPath
        : null,
    final: leavesInbox,
  };
}
