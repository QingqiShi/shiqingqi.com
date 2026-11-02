import { z } from "zod";
import type { AssistantModel } from "#src/assistant/ai/types.ts";
import type { AgentActionKind } from "#src/assistant/db/schema.ts";
import type {
  FetchedMessage,
  MailboxFolder,
} from "#src/assistant/mail/imap/types.ts";
import {
  isSyntheticMessageId,
  parseMailSafely,
  type ParsedMail,
} from "#src/assistant/mail/parse/parse-mail.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import {
  delimiterOf,
  destinationRefusal,
  findFolderNamed,
  isInbox,
  newFolderName,
  sourceRefusal,
} from "./destination-refusal.ts";
import type { MailHandles, MailRef } from "./mail-handles.ts";
import {
  readMailWithReader,
  type MailSummary,
} from "./read-mail-with-reader.ts";
import type { HeldMailbox, RunMailboxes } from "./run-mailboxes.ts";

/**
 * The limits of one run, against a runaway run or a mail that talks the
 * agent into mass changes; a normal clean-up, such as merging a few
 * folders, fits. A call over a limit is refused as a whole.
 */
export const MAIL_TOOL_LIMITS = {
  /** Folders made, renamed or deleted. */
  folderChangesPerAccount: 20,
  moves: 500,
  flagChanges: 500,
  idsPerCall: 100,
  readsPerCall: 10,
  listPage: 50,
};

/** The headers and the start of the text: enough for the envelope and the list headers. */
const HEADER_BYTES = 16 * 1024;
/** Enough of a mail for the reader. */
const BODY_BYTES = 64 * 1024;
const SEEN = "\\Seen";
const FLAGGED = "\\Flagged";
const MAX_REASON_CHARS = 300;

const FLAG_ACTIONS = {
  [SEEN]: {
    on: ["mark_read", "markedRead"],
    off: ["mark_unread", "markedUnread"],
  },
  [FLAGGED]: { on: ["flag", "flagged"], off: ["unflag", "unflagged"] },
} as const satisfies Record<
  string,
  Record<"on" | "off", readonly [AgentActionKind, keyof MailToolStats]>
>;

export interface MailToolStats {
  createdFolders: number;
  renamedFolders: number;
  deletedFolders: number;
  moved: number;
  markedRead: number;
  markedUnread: number;
  flagged: number;
  unflagged: number;
}

type MailToolLimits = typeof MAIL_TOOL_LIMITS;

export interface MailToolsInput {
  limits?: MailToolLimits;
  mailboxes: RunMailboxes;
  handles: MailHandles;
  reader: AssistantModel;
  run: AgentRunContext;
}

const accountKey = z
  .string()
  .describe('An account key from list_accounts, such as "a1".');
const mailIds = (max: number) =>
  z
    .array(z.string())
    .min(1)
    .max(max)
    .describe('Mail ids from list_mail in this run, such as "m12".');
const reason = z
  .string()
  .trim()
  .min(1)
  .max(MAX_REASON_CHARS)
  .describe("Why, in one short line for the owner's activity log.");

function senderOf(mail: ParsedMail) {
  if (!mail.fromAddress) return mail.fromName ?? "";
  return mail.fromName
    ? `${mail.fromName} <${mail.fromAddress}>`
    : mail.fromAddress;
}

function isBulk(mail: ParsedMail) {
  return (
    mail.listId !== null ||
    mail.listUnsubscribe !== null ||
    (mail.precedence !== null && /bulk|list|junk/i.test(mail.precedence)) ||
    (mail.autoSubmitted !== null && mail.autoSubmitted !== "no")
  );
}

function folderSummary(folder: MailboxFolder) {
  return {
    path: folder.path,
    specialUse: folder.specialUse,
    canMoveHere: destinationRefusal(folder) === null,
  };
}

interface Located {
  id: string;
  ref: MailRef;
  uid: number;
  message: FetchedMessage;
}

interface Skipped {
  id: string;
  why: string;
}

interface FolderGroup {
  folder: string;
  items: { id: string; ref: MailRef }[];
}

/** Ids by account. An unknown id refuses the whole call, before anything changes. */
function byAccount(handles: MailHandles, ids: readonly string[]) {
  const accounts = new Map<string, string[]>();
  for (const id of new Set(ids)) {
    const { accountKey } = handles.get(id);
    accounts.set(accountKey, [...(accounts.get(accountKey) ?? []), id]);
  }
  return accounts;
}

/**
 * Ids of one account by the folder they are in now. It runs while the tool
 * holds the account, so it sees the moves of calls that went before; an id
 * that stopped working since goes to `skipped`.
 */
function byFolder(
  handles: MailHandles,
  ids: readonly string[],
  skipped: Skipped[],
) {
  const groups = new Map<string, FolderGroup["items"]>();
  for (const id of ids) {
    let ref: MailRef;
    try {
      ref = handles.get(id);
    } catch (error) {
      if (!(error instanceof ToolRefusal)) throw error;
      skipped.push({ id, why: error.message });
      continue;
    }
    groups.set(ref.folder, [...(groups.get(ref.folder) ?? []), { id, ref }]);
  }
  return [...groups].map(([folder, items]): FolderGroup => ({ folder, items }));
}

/**
 * Finds each mail of one folder where the run last saw it, and fetches it
 * as it is now, up to `maxBytes`. The folder must be open. Mail whose
 * UIDVALIDITY changed or whose new UID is unknown is found again by its
 * Message-ID; mail that is gone gets its id forgotten.
 */
async function locate(
  mailbox: HeldMailbox,
  handles: MailHandles,
  uidValidity: number,
  items: readonly { id: string; ref: MailRef }[],
  maxBytes = 1,
): Promise<{ located: Located[]; skipped: Skipped[] }> {
  const skipped: Skipped[] = [];
  const candidates: { id: string; ref: MailRef; uid: number }[] = [];
  for (const { id, ref } of items) {
    if (ref.uid !== null && ref.uidValidity === uidValidity) {
      candidates.push({ id, ref, uid: ref.uid });
      continue;
    }
    const found = isSyntheticMessageId(ref.messageId)
      ? []
      : await mailbox.session.searchUids({ messageId: ref.messageId });
    if (found.length !== 1) {
      const why = `it is no longer where the run saw it in "${ref.folder}". List the folder again.`;
      handles.forget(id, why);
      skipped.push({ id, why });
      continue;
    }
    handles.update(id, { uid: found[0], uidValidity });
    candidates.push({ id, ref: handles.get(id), uid: found[0] });
  }
  const fetched = await mailbox.session.fetchMessages(
    candidates.map(({ uid }) => uid),
    maxBytes,
  );
  const byUid = new Map(fetched.map((message) => [message.uid, message]));
  const located: Located[] = [];
  for (const candidate of candidates) {
    const message = byUid.get(candidate.uid);
    if (!message) {
      const why = `it is no longer in "${candidate.ref.folder}"; the owner may have moved it.`;
      handles.forget(candidate.id, why);
      skipped.push({ id: candidate.id, why });
      continue;
    }
    located.push({ ...candidate, message });
  }
  return { located, skipped };
}

/**
 * The mailbox tools of an agent run. Every guardrail lives here, not in a
 * prompt: the tools only MOVE mail and change its read and flagged state,
 * never into Trash, Sent, Drafts or a virtual folder; nothing can delete
 * mail, expunge or send. A folder is deleted only when it is empty, and
 * INBOX and the special-use folders are never renamed or deleted. The tools
 * act only on ids this run listed, within the run's limits, and every change
 * needs a reason and goes to the action log.
 */
export function createMailTools({
  limits = MAIL_TOOL_LIMITS,
  mailboxes,
  handles,
  reader,
  run,
}: MailToolsInput) {
  const stats: MailToolStats = {
    createdFolders: 0,
    renamedFolders: 0,
    deletedFolders: 0,
    moved: 0,
    markedRead: 0,
    markedUnread: 0,
    flagged: 0,
    unflagged: 0,
  };
  const folderChangesIn = new Map<string, number>();
  const reserved = { moves: 0, flagChanges: 0 };

  /**
   * Takes `count` of a run limit before the call waits for its account, so
   * that calls the model makes at the same time cannot go over the limit
   * together. The returned function gives back what the call did not use.
   */
  function reserve(
    limit: keyof typeof reserved,
    count: number,
    refusal: (left: number) => string,
  ) {
    const left = limits[limit] - reserved[limit];
    if (count > left) throw new ToolRefusal(refusal(left));
    reserved[limit] += count;
    return (used: number) => {
      reserved[limit] -= count - used;
    };
  }

  /** Takes one of the account's folder changes, or refuses when none is left. */
  function takeFolderChange(mailbox: HeldMailbox) {
    const key = mailbox.account.key;
    const made = folderChangesIn.get(key) ?? 0;
    if (made >= limits.folderChangesPerAccount) {
      throw new ToolRefusal(
        `This run has made, renamed or deleted ${String(made)} folders in ${key}, the most it may.`,
      );
    }
    folderChangesIn.set(key, made + 1);
  }

  /** The folders inside `folder`, at any depth. */
  function foldersInside(mailbox: HeldMailbox, folder: MailboxFolder) {
    const delimiter = folder.delimiter ?? delimiterOf(mailbox.folders);
    if (!delimiter) return [];
    return mailbox.folders.filter((other) =>
      other.path.startsWith(`${folder.path}${delimiter}`),
    );
  }

  /** Why a folder may not be renamed or deleted, or null when it may. */
  function folderChangeRefusal(mailbox: HeldMailbox, folder: MailboxFolder) {
    if (isInbox(folder)) return "INBOX is never renamed or deleted.";
    if (folder.specialUse !== null) {
      return `"${folder.path}" (${folder.specialUse}) is never renamed or deleted.`;
    }
    const special = foldersInside(mailbox, folder).find(
      (inside) => inside.specialUse !== null,
    );
    if (special) {
      return `"${folder.path}" holds "${special.path}" (${String(special.specialUse)}), so it is never renamed or deleted.`;
    }
    return null;
  }

  async function logMail(
    kind: AgentActionKind,
    mailbox: HeldMailbox,
    item: Located,
    why: string,
    extra: { toFolder?: string; detail?: Record<string, unknown> } = {},
  ) {
    await run.logAction({
      accountId: mailbox.account.id,
      kind,
      messageId: item.ref.messageId,
      subject: item.ref.subject,
      sender: item.ref.sender,
      fromFolder: item.ref.folder,
      toFolder: extra.toFolder ?? null,
      detail: {
        uidValidity: item.ref.uidValidity,
        uid: item.uid,
        ...extra.detail,
      },
      reason: why,
    });
  }

  /**
   * Runs `task` for the mail of each folder that the ids name, while the tool
   * holds the account. `check` sees every folder of the account first, so a
   * refusal comes before any change.
   */
  async function eachFolder(
    ids: readonly string[],
    skipped: Skipped[],
    task: (mailbox: HeldMailbox, group: FolderGroup) => Promise<void>,
    check?: (mailbox: HeldMailbox, group: FolderGroup) => void,
  ) {
    for (const [key, accountIds] of byAccount(handles, ids)) {
      await mailboxes.use(key, async (mailbox) => {
        const groups = byFolder(handles, accountIds, skipped);
        if (check) for (const group of groups) check(mailbox, group);
        for (const group of groups) await task(mailbox, group);
      });
    }
  }

  async function setFlag(
    ids: readonly string[],
    flag: typeof SEEN | typeof FLAGGED,
    on: boolean,
    why: string,
  ) {
    const release = reserve(
      "flagChanges",
      new Set(ids).size,
      (left) =>
        `This run may change the read or flagged state of ${String(left)} more mails.`,
    );
    const [kind, counter] = FLAG_ACTIONS[flag][on ? "on" : "off"];
    const done: string[] = [];
    const skipped: Skipped[] = [];
    try {
      await eachFolder(ids, skipped, async (mailbox, group) => {
        const uidValidity = await mailbox.select(group.folder, true);
        const found = await locate(mailbox, handles, uidValidity, group.items);
        skipped.push(...found.skipped);
        const changing: Located[] = [];
        for (const item of found.located) {
          if (item.message.flags.includes(flag) !== on) changing.push(item);
          else skipped.push({ id: item.id, why: "it is like that already." });
        }
        if (changing.length === 0) return;
        const uids = changing.map((item) => item.uid);
        if (on) await mailbox.session.addFlags(uids, [flag]);
        else await mailbox.session.removeFlags(uids, [flag]);
        for (const item of changing) {
          await logMail(kind, mailbox, item, why);
          done.push(item.id);
        }
        stats[counter] += changing.length;
      });
    } finally {
      release(done.length);
    }
    return { changed: done, skipped };
  }

  const tools = {
    list_accounts: agentTool({
      description:
        "The owner's mailboxes in this run, each with the key the other tools take.",
      inputSchema: z.object({}),
      execute: () =>
        Promise.resolve({
          accounts: mailboxes.accounts.map((account) => ({
            account: account.key,
            address: account.address,
            provider: account.provider,
          })),
        }),
    }),

    list_folders: agentTool({
      description:
        "The folders of one mailbox. canMoveHere is false for folders that mail never goes into.",
      loadUpFront: true,
      inputSchema: z.object({ account: accountKey }),
      execute: ({ account }) =>
        mailboxes.use(account, (mailbox) =>
          Promise.resolve({
            delimiter: delimiterOf(mailbox.folders),
            folders: mailbox.folders.map(folderSummary),
          }),
        ),
    }),

    list_mail: agentTool({
      description:
        "Lists mail of one folder by its headers, a page at a time, and gives each mail an id for the other tools. bulk is true for mailing lists and automatic mail.",
      loadUpFront: true,
      inputSchema: z.object({
        account: accountKey,
        folder: z.string().describe("A folder path from list_folders."),
        unreadOnly: z.boolean().optional(),
        since: z.iso
          .date()
          .optional()
          .describe("Only mail received on or after this date, YYYY-MM-DD."),
        before: z.iso
          .date()
          .optional()
          .describe("Only mail received before this date, YYYY-MM-DD."),
        order: z
          .enum(["oldest", "newest"])
          .optional()
          .describe("Default oldest."),
        limit: z.number().int().min(1).max(limits.listPage).optional(),
        cursor: z
          .string()
          .optional()
          .describe("The nextCursor of the page before, for the next page."),
      }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const folder = mailbox.folder(input.folder);
          if (!folder.selectable) {
            throw new ToolRefusal(`"${folder.path}" only holds other folders.`);
          }
          const uidValidity = await mailbox.select(folder.path, false);
          let after: number | null = null;
          if (input.cursor) {
            const [validity, uid] = input.cursor.split(":").map(Number);
            if (validity !== uidValidity || !Number.isInteger(uid)) {
              throw new ToolRefusal(
                "The cursor is out of date. List the folder again from the start.",
              );
            }
            after = uid;
          }
          const newest = input.order === "newest";
          const all = await mailbox.session.searchUids({
            since: input.since
              ? new Date(`${input.since}T00:00:00Z`)
              : undefined,
            before: input.before
              ? new Date(`${input.before}T00:00:00Z`)
              : undefined,
            seen: input.unreadOnly ? false : undefined,
          });
          const ordered = newest ? [...all].reverse() : all;
          const rest =
            after === null
              ? ordered
              : ordered.filter((uid) => (newest ? uid < after : uid > after));
          const limit = input.limit ?? 25;
          const page = rest.slice(0, limit);
          const fetched = await mailbox.session.fetchMessages(
            page,
            HEADER_BYTES,
          );
          const mails = await Promise.all(fetched.map(parseMailSafely));
          const byUid = new Map(mails.map((mail) => [mail.uid, mail]));
          const listed = page.flatMap((uid) => {
            const mail = byUid.get(uid);
            if (!mail) return [];
            const id = handles.register({
              accountKey: mailbox.account.key,
              folder: folder.path,
              uidValidity,
              uid,
              messageId: mail.messageId,
              subject: mail.subject,
              sender: senderOf(mail),
            });
            return [
              {
                id,
                date: (mail.sentAt ?? mail.receivedAt).toISOString(),
                from: senderOf(mail),
                to: mail.toAddresses.slice(0, 3),
                subject: mail.subject,
                unread: !mail.flags.includes(SEEN),
                flagged: mail.flags.includes(FLAGGED),
                bulk: isBulk(mail),
              },
            ];
          });
          const last = page.at(-1);
          return {
            total: all.length,
            mails: listed,
            nextCursor:
              rest.length > page.length && last !== undefined
                ? `${String(uidValidity)}:${String(last)}`
                : null,
          };
        }),
    }),

    read_mail: agentTool({
      description:
        "Has a reader with no tools read the text of mails and describe each: its kind, a short summary, whether the owner needs to see it, any warning, and the events it books, moves or cancels. The text itself does not come back. Reading does not mark mail read.",
      inputSchema: z.object({ ids: mailIds(limits.readsPerCall) }),
      execute: async ({ ids }) => {
        const skipped: Skipped[] = [];
        const toRead: { id: string; mail: ParsedMail }[] = [];
        await eachFolder(ids, skipped, async (mailbox, group) => {
          const uidValidity = await mailbox.select(group.folder, false);
          const found = await locate(
            mailbox,
            handles,
            uidValidity,
            group.items,
            BODY_BYTES,
          );
          skipped.push(...found.skipped);
          for (const item of found.located) {
            toRead.push({
              id: item.id,
              mail: await parseMailSafely(item.message),
            });
          }
        });
        const summaries =
          toRead.length > 0
            ? await readMailWithReader(reader, toRead, (usage) => {
                run.addUsage(reader.id, usage);
              })
            : new Map<string, MailSummary>();
        return {
          mails: toRead.flatMap(({ id }) => {
            const summary = summaries.get(id);
            if (!summary) {
              skipped.push({ id, why: "the reader gave no description." });
              return [];
            }
            return [{ id, ...summary }];
          }),
          skipped,
        };
      },
    }),

    create_folder: agentTool({
      description:
        "Makes a folder, at the top level or inside parent. When a folder of that name exists, ignoring case and spaces, it gives that folder back instead.",
      inputSchema: z.object({
        account: accountKey,
        name: z.string().min(1).max(100),
        parent: z
          .string()
          .optional()
          .describe("The path of an existing folder to make it in."),
        reason,
      }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const delimiter = delimiterOf(mailbox.folders);
          const name = newFolderName(input.name, delimiter);
          if (!name) throw new ToolRefusal("That folder name is empty.");
          let path = name;
          if (input.parent !== undefined) {
            const parent = mailbox.folder(input.parent);
            if (parent.specialUse !== null) {
              throw new ToolRefusal(
                `No folder is made inside "${parent.path}" (${parent.specialUse}).`,
              );
            }
            if (!delimiter) {
              throw new ToolRefusal(
                "This mailbox has no folders inside folders.",
              );
            }
            path = `${parent.path}${delimiter}${name}`;
          }
          const existing = findFolderNamed(path, mailbox.folders);
          if (existing) {
            return {
              folder: existing.path,
              created: false,
              canMoveHere: destinationRefusal(existing) === null,
            };
          }
          takeFolderChange(mailbox);
          await mailbox.session.createFolder(path);
          stats.createdFolders += 1;
          await mailbox.refreshFolders();
          await run.logAction({
            accountId: mailbox.account.id,
            kind: "create_folder",
            toFolder: path,
            reason: input.reason,
          });
          return { folder: path, created: true, canMoveHere: true };
        }),
    }),

    rename_folder: agentTool({
      description:
        "Renames a folder, or moves it inside another parent; its mail and the folders inside it go with it. The mail ids of this run keep working.",
      inputSchema: z.object({
        account: accountKey,
        folder: z.string().describe("The path of the folder to rename."),
        name: z.string().min(1).max(100).describe("Its new name."),
        parent: z
          .string()
          .nullable()
          .optional()
          .describe(
            "The path of the folder to put it in; null for the top level. Leave it out to keep the parent it has.",
          ),
        reason,
      }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const folder = mailbox.folder(input.folder);
          const refusal = folderChangeRefusal(mailbox, folder);
          if (refusal) throw new ToolRefusal(refusal);
          const delimiter = delimiterOf(mailbox.folders);
          const name = newFolderName(input.name, delimiter);
          if (!name) throw new ToolRefusal("That folder name is empty.");
          let parentPath: string | null =
            delimiter && folder.path.includes(delimiter)
              ? folder.path.slice(0, folder.path.lastIndexOf(delimiter))
              : null;
          if (input.parent !== undefined) parentPath = input.parent;
          if (parentPath !== null) {
            const parent = mailbox.folder(parentPath);
            if (parent.specialUse !== null) {
              throw new ToolRefusal(
                `No folder goes inside "${parent.path}" (${parent.specialUse}).`,
              );
            }
            if (
              parent.path === folder.path ||
              foldersInside(mailbox, folder).includes(parent)
            ) {
              throw new ToolRefusal("A folder cannot go inside itself.");
            }
            if (!delimiter) {
              throw new ToolRefusal(
                "This mailbox has no folders inside folders.",
              );
            }
          }
          const path =
            parentPath === null || delimiter === null
              ? name
              : `${parentPath}${delimiter}${name}`;
          if (path === folder.path) {
            return { folder: path, renamed: false };
          }
          const existing = findFolderNamed(path, mailbox.folders);
          if (existing && existing.path !== folder.path) {
            throw new ToolRefusal(
              `"${existing.path}" exists already. To merge the two, move the mail of one into the other.`,
            );
          }
          takeFolderChange(mailbox);
          await mailbox.session.renameFolder(folder.path, path);
          stats.renamedFolders += 1;
          handles.renameFolder(
            mailbox.account.key,
            folder.path,
            path,
            delimiter,
          );
          await mailbox.refreshFolders();
          await run.logAction({
            accountId: mailbox.account.id,
            kind: "rename_folder",
            fromFolder: folder.path,
            toFolder: path,
            reason: input.reason,
          });
          return { folder: path, renamed: true };
        }),
    }),

    delete_folder: agentTool({
      description:
        "Deletes a folder that holds no mail and no other folders. It never deletes mail: move the mail out first.",
      inputSchema: z.object({
        account: accountKey,
        folder: z.string().describe("The path of the folder to delete."),
        reason,
      }),
      execute: (input) =>
        mailboxes.use(input.account, async (mailbox) => {
          const folder = mailbox.folder(input.folder);
          const refusal = folderChangeRefusal(mailbox, folder);
          if (refusal) throw new ToolRefusal(refusal);
          if (foldersInside(mailbox, folder).length > 0) {
            throw new ToolRefusal(
              `"${folder.path}" holds other folders. Delete or move them first.`,
            );
          }
          if (folder.selectable) {
            await mailbox.select(folder.path, false);
            const held = await mailbox.session.searchUids({});
            if (held.length > 0) {
              throw new ToolRefusal(
                `"${folder.path}" holds ${String(held.length)} mails. Move them out first.`,
              );
            }
          }
          takeFolderChange(mailbox);
          await mailbox.session.deleteEmptyFolder(folder.path);
          stats.deletedFolders += 1;
          await mailbox.refreshFolders();
          await run.logAction({
            accountId: mailbox.account.id,
            kind: "delete_folder",
            fromFolder: folder.path,
            reason: input.reason,
          });
          return { deleted: folder.path };
        }),
    }),

    move_mail: agentTool({
      description:
        "Moves mail of one account into a folder, from the inbox or any other folder. Mail never goes into Trash, Sent, Drafts or a virtual folder.",
      inputSchema: z.object({
        ids: mailIds(limits.idsPerCall),
        folder: z
          .string()
          .describe("The path of the folder to move them into."),
        reason,
      }),
      execute: async (input) => {
        if (byAccount(handles, input.ids).size > 1) {
          throw new ToolRefusal(
            "move_mail takes mail of one account at a time.",
          );
        }
        const release = reserve(
          "moves",
          new Set(input.ids).size,
          (left) =>
            `This run may move ${String(left)} more mails. Leave the rest for the next run.`,
        );
        const moved: string[] = [];
        const skipped: Skipped[] = [];
        const check = (mailbox: HeldMailbox, group: FolderGroup) => {
          const destination = mailbox.folder(input.folder);
          const refusal =
            destinationRefusal(destination) ??
            (destination.path === group.folder
              ? null
              : sourceRefusal(mailbox.folder(group.folder)));
          if (refusal) throw new ToolRefusal(refusal);
        };
        const move = async (mailbox: HeldMailbox, group: FolderGroup) => {
          const destination = mailbox.folder(input.folder);
          if (destination.path === group.folder) {
            for (const { id } of group.items) {
              skipped.push({ id, why: "it is in that folder already." });
            }
            return;
          }
          const uidValidity = await mailbox.select(group.folder, true);
          const found = await locate(
            mailbox,
            handles,
            uidValidity,
            group.items,
          );
          skipped.push(...found.skipped);
          if (found.located.length === 0) return;
          const result = await mailbox.session.moveMessages(
            found.located.map(({ uid }) => uid),
            destination.path,
          );
          for (const item of found.located) {
            const newUid = result?.uidMap.get(item.uid) ?? null;
            await logMail("move", mailbox, item, input.reason, {
              toFolder: destination.path,
              detail: {
                toUidValidity: result?.uidValidity ?? null,
                toUid: newUid,
              },
            });
            handles.update(item.id, {
              folder: destination.path,
              uidValidity: result?.uidValidity ?? 0,
              uid: newUid,
            });
            moved.push(item.id);
          }
          stats.moved += found.located.length;
        };
        try {
          await eachFolder(input.ids, skipped, move, check);
        } finally {
          release(moved.length);
        }
        return { moved, folder: input.folder, skipped };
      },
    }),

    mark_read: agentTool({
      description: "Marks mail read (read: true) or unread (read: false).",
      inputSchema: z.object({
        ids: mailIds(limits.idsPerCall),
        read: z.boolean(),
        reason,
      }),
      execute: (input) => setFlag(input.ids, SEEN, input.read, input.reason),
    }),

    mark_flagged: agentTool({
      description:
        "Flags mail (flagged: true) or takes the flag off (flagged: false).",
      inputSchema: z.object({
        ids: mailIds(limits.idsPerCall),
        flagged: z.boolean(),
        reason,
      }),
      execute: (input) =>
        setFlag(input.ids, FLAGGED, input.flagged, input.reason),
    }),
  } satisfies AgentTools;

  return { tools, stats };
}
