import { z } from "zod";
import type { AssistantModel } from "#src/assistant/ai/types.ts";
import type { MailboxFolder } from "#src/assistant/mail/imap/types.ts";
import {
  parseMailSafely,
  type ParsedMail,
} from "#src/assistant/mail/parse/parse-mail.ts";
import { agentTool, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import { accountKey, mailIds } from "./constants.ts";
import { createMailChangeTools } from "./create-mail-change-tools.ts";
import { createMailFolderTools } from "./create-mail-folder-tools.ts";
import { delimiterOf, destinationRefusal } from "./destination-refusal.ts";
import { listMail } from "./list-mail.ts";
import { eachFolder, locate, mailsOf, type Skipped } from "./locate.ts";
import type { MailHandles } from "./mail-handles.ts";
import {
  readMailWithReader,
  type MailSummary,
} from "./read-mail-with-reader.ts";
import type { RunMailboxes } from "./run-mailboxes.ts";
import type { MailToolStats } from "./types.ts";

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

/** Enough of a mail for the reader. */
const BODY_BYTES = 64 * 1024;

type MailToolLimits = typeof MAIL_TOOL_LIMITS;

export interface MailToolsInput {
  limits?: MailToolLimits;
  mailboxes: RunMailboxes;
  handles: MailHandles;
  reader: AssistantModel;
  run: AgentRunContext;
  /** The owner's zone, for the days of list_mail. Default UTC. */
  timeZone?: string;
}

const listBound = z.union([z.iso.date(), z.iso.datetime({ offset: true })]);

function folderSummary(folder: MailboxFolder) {
  return {
    path: folder.path,
    specialUse: folder.specialUse,
    canMoveHere: destinationRefusal(folder) === null,
  };
}

/**
 * The mailbox tools of an agent run. Every guardrail lives in these tools,
 * not in a prompt: the tools only move mail and change its read and flagged state,
 * never into Trash, Sent, Drafts or a virtual folder; nothing can delete
 * mail or send. A folder is deleted only when it is empty, and
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
  timeZone = "UTC",
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

  const tools = {
    list_accounts: agentTool({
      description:
        "The owner's mailboxes in this run, each with the key the other tools take.",
      inputSchema: z.object({}),
      describe: () => ({ kind: "list_accounts" }),
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
      describe: () => ({ kind: "list_folders" }),
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
        "Lists mail of one folder by its headers, a page at a time, and gives each mail an id for the other tools. bulk is true for mailing lists and automatic mail. With since or before, a page can hold fewer mails than the limit: follow nextCursor until it is null.",
      loadUpFront: true,
      inputSchema: z.object({
        account: accountKey,
        folder: z.string().describe("A folder path from list_folders."),
        unreadOnly: z.boolean().optional(),
        since: listBound
          .optional()
          .describe(
            "Only mail received at or after this: a day in the owner's time zone, YYYY-MM-DD, or an exact time, such as 2026-10-31T08:00:00Z.",
          ),
        before: listBound
          .optional()
          .describe(
            "Only mail received before this: a day in the owner's time zone, YYYY-MM-DD, or an exact time, such as 2026-11-01T08:00:00Z.",
          ),
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
      describe: ({ folder }) => ({ kind: "list_mail", folder }),
      execute: (input) => listMail({ mailboxes, handles, timeZone }, input),
    }),

    read_mail: agentTool({
      description:
        "Reads mails for you. A separate model reads the text of each mail and returns its kind, a short summary, whether the owner needs to see it, any warning, and the events it books, moves or cancels. You do not get the text itself. This does not mark mail read.",
      inputSchema: z.object({ ids: mailIds(limits.readsPerCall) }),
      describe: ({ ids }) => ({ kind: "read_mail", ...mailsOf(handles, ids) }),
      execute: async ({ ids }) => {
        const skipped: Skipped[] = [];
        const toRead: { id: string; mail: ParsedMail }[] = [];
        await eachFolder(
          { mailboxes, handles },
          ids,
          skipped,
          async (mailbox, group) => {
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
          },
        );
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

    ...createMailFolderTools({ limits, mailboxes, handles, run, stats }),

    ...createMailChangeTools({ limits, mailboxes, handles, run, stats }),
  } satisfies AgentTools;

  return { tools, stats };
}
