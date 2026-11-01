import { describe, expect, it } from "vitest";
import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";
import { reportFolders } from "./report-folders.ts";

function folder(
  path: string,
  specialUse: string | null = null,
  selectable = true,
): MailboxFolder {
  return {
    path,
    name: path,
    delimiter: "/",
    specialUse,
    selectable,
    messages: null,
    unseen: null,
  };
}

const gmail = [
  folder("INBOX", "\\Inbox"),
  folder("Bills"),
  folder("[Gmail]", null, false),
  folder("[Gmail]/All Mail", "\\All"),
  folder("[Gmail]/Sent Mail", "\\Sent"),
  folder("[Gmail]/Starred", "\\Flagged"),
  folder("[Gmail]/Important", "\\Important"),
  folder("[Gmail]/Spam", "\\Junk"),
  folder("[Gmail]/Bin", "\\Trash"),
  folder("[Gmail]/Drafts", "\\Drafts"),
];

describe("reportFolders", () => {
  it("reads only All Mail on Gmail, where each label folder shows the same mail again", () => {
    expect(reportFolders("gmail", gmail)).toEqual(["[Gmail]/All Mail"]);
  });

  it("reads every other selectable folder on other servers, the inbox and archive included", () => {
    expect(
      reportFolders("icloud", [
        folder("INBOX", "\\Inbox"),
        folder("Archive", "\\Archive"),
        folder("Bills"),
        folder("Family", null, false),
        folder("Family/School"),
        folder("Sent Messages", "\\Sent"),
        folder("Drafts", "\\Drafts"),
        folder("Deleted Messages", "\\Trash"),
        folder("Junk", "\\Junk"),
      ]),
    ).toEqual(["INBOX", "Archive", "Bills", "Family/School"]);
  });

  it("falls back to the folder list on a Gmail account without All Mail", () => {
    expect(
      reportFolders(
        "gmail",
        gmail.filter((entry) => entry.specialUse !== "\\All"),
      ),
    ).toEqual(["INBOX", "Bills"]);
  });
});
