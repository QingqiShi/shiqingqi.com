import { z } from "zod";
import type { AgentActionKind } from "#src/assistant/db/schema.ts";
import { agentTool, ToolRefusal, type AgentTools } from "../agent-tool.ts";
import type { AgentRunContext } from "../run-agent.ts";
import { FLAGGED, mailIds, reason, SEEN } from "./constants.ts";
import { destinationRefusal, sourceRefusal } from "./destination-refusal.ts";
import {
  byAccount,
  eachFolder,
  locate,
  mailsOf,
  type FolderGroup,
  type Located,
  type Skipped,
} from "./locate.ts";
import type { MailHandles } from "./mail-handles.ts";
import type { HeldMailbox, RunMailboxes } from "./run-mailboxes.ts";
import type { MailToolStats } from "./types.ts";

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

export function createMailChangeTools({
  limits,
  mailboxes,
  handles,
  run,
  stats,
}: {
  limits: { moves: number; flagChanges: number; idsPerCall: number };
  mailboxes: RunMailboxes;
  handles: MailHandles;
  run: AgentRunContext;
  stats: MailToolStats;
}) {
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
      await eachFolder(
        { mailboxes, handles },
        ids,
        skipped,
        async (mailbox, group) => {
          const uidValidity = await mailbox.select(group.folder, true);
          const found = await locate(
            mailbox,
            handles,
            uidValidity,
            group.items,
          );
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
        },
      );
    } finally {
      release(done.length);
    }
    return { changed: done, skipped };
  }

  return {
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
      describe: ({ ids, folder }) => ({
        kind: "move_mail",
        ...mailsOf(handles, ids),
        toFolder: folder,
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
          if (!mailbox.session.supportsMove()) {
            throw new ToolRefusal(
              `The mail server of ${mailbox.account.key} cannot move mail safely. Leave its mail where it is.`,
            );
          }
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
          await eachFolder(
            { mailboxes, handles },
            input.ids,
            skipped,
            move,
            check,
          );
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
      describe: ({ ids, read }) => ({
        kind: "mark_read",
        ...mailsOf(handles, ids),
        read,
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
      describe: ({ ids, flagged }) => ({
        kind: "mark_flagged",
        ...mailsOf(handles, ids),
        flagged,
      }),
      execute: (input) =>
        setFlag(input.ids, FLAGGED, input.flagged, input.reason),
    }),
  } satisfies AgentTools;
}
