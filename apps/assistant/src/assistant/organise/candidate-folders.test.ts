import { describe, expect, it } from "vitest";
import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";
import {
  candidateFolders,
  findFolderNamed,
  newFolderName,
} from "./candidate-folders.ts";

function folder(
  path: string,
  options: { specialUse?: string; selectable?: boolean } = {},
): MailboxFolder {
  return {
    path,
    name: path.split("/").at(-1) ?? path,
    delimiter: "/",
    specialUse: options.specialUse ?? null,
    selectable: options.selectable ?? true,
  };
}

describe("candidateFolders", () => {
  it("keeps the user's folders and the archive, and leaves out the inbox, the client's own folders and folders that only hold folders", () => {
    const folders = [
      folder("INBOX"),
      folder("[Gmail]", { selectable: false }),
      folder("[Gmail]/All Mail", { specialUse: "\\All" }),
      folder("[Gmail]/Sent Mail", { specialUse: "\\Sent" }),
      folder("[Gmail]/Drafts", { specialUse: "\\Drafts" }),
      folder("[Gmail]/Bin", { specialUse: "\\Trash" }),
      folder("[Gmail]/Spam", { specialUse: "\\Junk" }),
      folder("[Gmail]/Starred", { specialUse: "\\Flagged" }),
      folder("[Gmail]/Important", { specialUse: "\\Important" }),
      folder("Archive", { specialUse: "\\Archive" }),
      folder("Finance"),
      folder("Work/Projects"),
    ];

    expect(candidateFolders(folders)).toEqual([
      "Archive",
      "Finance",
      "Work/Projects",
    ]);
  });
});

describe("newFolderName", () => {
  it("strips control characters, the delimiter and wildcards, and collapses spaces", () => {
    expect(newFolderName("  Travel\u0000/\tBookings*% ", "/")).toBe(
      "Travel Bookings",
    );
    expect(newFolderName("Bills.Home", ".")).toBe("Bills Home");
  });

  it("cuts a long name to 40 characters and refuses an empty one", () => {
    expect(newFolderName("a".repeat(60), "/")).toHaveLength(40);
    expect(newFolderName(" / \u0007 ", "/")).toBeNull();
  });
});

describe("findFolderNamed", () => {
  it("finds an existing folder by its path or name, ignoring case and spaces", () => {
    const folders = [folder("INBOX"), folder("My Bills"), folder("Work/Trips")];

    expect(findFolderNamed("my bills", folders)?.path).toBe("My Bills");
    expect(findFolderNamed("MyBills", folders)?.path).toBe("My Bills");
    expect(findFolderNamed("trips", folders)?.path).toBe("Work/Trips");
    expect(findFolderNamed("Inbox", folders)?.path).toBe("INBOX");
    expect(findFolderNamed("Receipts", folders)).toBeNull();
  });
});
