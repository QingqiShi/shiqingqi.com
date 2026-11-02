import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import type {
  CalendarConnector,
  CalendarSession,
} from "#src/assistant/calendar/caldav/types.ts";
import { agentActions, mailAccounts } from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import {
  openMailboxSession,
  type MailboxDeps,
} from "#src/assistant/mail/accounts/open-mailbox-session.ts";
import { ownAccount } from "#src/assistant/mail/accounts/own-account.ts";
import { resolveMailboxAuth } from "#src/assistant/mail/accounts/resolve-mailbox-auth.ts";
import type {
  MailboxFolder,
  MailboxSession,
} from "#src/assistant/mail/imap/types.ts";
import {
  isSyntheticMessageId,
  parseMailSafely,
} from "#src/assistant/mail/parse/parse-mail.ts";

export interface UndoDeps extends MailboxDeps {
  calendarConnector: CalendarConnector;
}

/** Why an action was not undone. Nothing changed for it. */
export const UNDO_REFUSALS = [
  /** The mail is not in `folder` any more. */
  "mail-gone",
  /** `folder`, which the undo needs, does not exist any more. */
  "folder-gone",
  /** `folder` holds mail, so it stays. */
  "folder-not-empty",
  /** `folder` holds other folders, so it stays. */
  "folder-has-folders",
  /** A folder named `folder` exists already. */
  "folder-exists",
  /** The event is not in the calendar any more. */
  "event-gone",
  /** The event changed in the calendar since the assistant wrote it. */
  "event-changed",
  /** The mailbox is no longer connected. */
  "account-gone",
  /** The mailbox or calendar did not let the app log in, or a command failed. */
  "failed",
] as const;
export type UndoRefusal = (typeof UNDO_REFUSALS)[number];

export type UndoOutcome =
  | { actionId: string; undone: true }
  | { actionId: string; undone: false; refusal: UndoRefusal; folder?: string };

export type UndoTarget = { actionIds: readonly string[] } | { runId: string };

type ActionRow = typeof agentActions.$inferSelect;

/** What a refused undo throws inside this module; it changes nothing. */
class Refused extends Error {
  readonly refusal: UndoRefusal;
  readonly folder: string | undefined;

  constructor(refusal: UndoRefusal, folder?: string) {
    super(refusal);
    this.refusal = refusal;
    this.folder = folder;
  }
}

const SEEN = "\\Seen";
const FLAGGED = "\\Flagged";
const HEADER_BYTES = 16 * 1024;

const FLAG_UNDO = {
  mark_read: { flag: SEEN, set: false },
  mark_unread: { flag: SEEN, set: true },
  flag: { flag: FLAGGED, set: false },
  unflag: { flag: FLAGGED, set: true },
} as const;

const mailDetail = z.object({
  uidValidity: z.number().nullish(),
  uid: z.number().nullish(),
  toUidValidity: z.number().nullish(),
  toUid: z.number().nullish(),
});

const eventDetail = z.object({
  calendarUrl: z.string(),
  href: z.string(),
  etag: z.string().nullish(),
  previous: z
    .object({ href: z.string(), etag: z.string().nullable(), ics: z.string() })
    .optional(),
  undo: z.object({ etag: z.string().nullable() }).optional(),
});

/** One logged-in mailbox for the undo, with the folder it has open. */
class UndoMailbox {
  readonly session: MailboxSession;
  #folders: MailboxFolder[] | null = null;
  #open: { path: string; write: boolean; uidValidity: number } | null = null;

  constructor(session: MailboxSession) {
    this.session = session;
  }

  async folders() {
    this.#folders ??= await this.session.listFolders();
    return this.#folders;
  }

  async has(path: string) {
    return (await this.folders()).some((folder) => folder.path === path);
  }

  async inside(path: string) {
    const folders = await this.folders();
    const delimiter = folders.find((folder) => folder.delimiter)?.delimiter;
    if (!delimiter) return [];
    return folders.filter((folder) =>
      folder.path.startsWith(`${path}${delimiter}`),
    );
  }

  folderChanged() {
    this.#folders = null;
    this.#open = null;
  }

  async select(path: string, write: boolean) {
    if (this.#open?.path === path && (this.#open.write || !write)) {
      return this.#open.uidValidity;
    }
    this.#open = null;
    const opened = await this.session.openFolder(path, { write });
    this.#open = { path, write, uidValidity: opened.uidValidity };
    return opened.uidValidity;
  }

  /**
   * The UID of the mail in `path`: first at the UID the action noted, then
   * by its Message-ID. Each candidate is read, so that only the same mail
   * counts. Null when the folder does not hold it.
   */
  async find(
    path: string,
    messageId: string,
    hint: { uidValidity?: number | null; uid?: number | null },
  ) {
    if (!(await this.has(path))) return null;
    const uidValidity = await this.select(path, true);
    const candidates =
      hint.uid && hint.uidValidity === uidValidity ? [hint.uid] : [];
    if (!isSyntheticMessageId(messageId)) {
      candidates.push(...(await this.session.searchUids({ messageId })));
    }
    for (const uid of new Set(candidates)) {
      const message = (
        await this.session.fetchMessages([uid], HEADER_BYTES)
      ).at(0);
      if (!message) continue;
      if ((await parseMailSafely(message)).messageId === messageId) return uid;
    }
    return null;
  }
}

/**
 * Takes back changes that agents made, newest first, for one user: mail
 * moves back, read and flagged state flips back, folders come back or go
 * when they are empty, and calendar events go back to the ICS kept before
 * the change. Each undone action gets `undone_at`. An action that cannot be
 * undone, because its mail or event is gone or changed, is left as it is
 * and the others go on. It never deletes mail.
 *
 * Returns null when no action of the target belongs to the user.
 */
export async function undoAgentActions(
  { db, userId, now }: { db: AssistantDb; userId: string; now: () => Date },
  deps: UndoDeps,
  target: UndoTarget,
): Promise<UndoOutcome[] | null> {
  const rows = await db
    .select()
    .from(agentActions)
    .where(
      and(
        eq(agentActions.userId, userId),
        "runId" in target
          ? eq(agentActions.runId, target.runId)
          : inArray(agentActions.id, [...target.actionIds]),
      ),
    )
    .orderBy(desc(agentActions.createdAt));
  if (rows.length === 0) return null;

  const mailboxes = new Map<string, Promise<UndoMailbox>>();
  const calendars = new Map<string, Promise<CalendarSession>>();

  async function storedAccount(accountId: string | null) {
    if (accountId === null) throw new Refused("account-gone");
    const account = (
      await db
        .select({
          id: mailAccounts.id,
          provider: mailAccounts.provider,
          address: mailAccounts.address,
          credential: mailAccounts.credential,
        })
        .from(mailAccounts)
        .where(ownAccount(userId, accountId))
    ).at(0);
    if (!account) throw new Refused("account-gone");
    return account;
  }

  function mailboxOf(accountId: string | null) {
    const key = accountId ?? "";
    let mailbox = mailboxes.get(key);
    if (!mailbox) {
      mailbox = storedAccount(accountId).then(
        async (account) =>
          new UndoMailbox(await openMailboxSession(db, userId, account, deps)),
      );
      mailboxes.set(key, mailbox);
    }
    return mailbox;
  }

  function calendarOf(accountId: string | null) {
    const key = accountId ?? "";
    let calendar = calendars.get(key);
    if (!calendar) {
      calendar = storedAccount(accountId).then(async (account) => {
        const auth = await resolveMailboxAuth(db, userId, account, deps.auth);
        if (!("pass" in auth)) throw new Refused("failed");
        return deps.calendarConnector({ user: auth.user, pass: auth.pass });
      });
      calendars.set(key, calendar);
    }
    return calendar;
  }

  /**
   * The etag the event has when nobody but the agents changed it since:
   * that of the last write or undo of any action on it. Refuses while a
   * later action on the event is in place, or when somebody changed the
   * event between this action and the next, because the undo would then
   * overwrite that change.
   */
  async function knownEtag(row: ActionRow, own: z.infer<typeof eventDetail>) {
    const writes = (
      await db
        .select({
          id: agentActions.id,
          createdAt: agentActions.createdAt,
          undoneAt: agentActions.undoneAt,
          detail: agentActions.detail,
        })
        .from(agentActions)
        .where(
          and(
            eq(agentActions.userId, userId),
            sql`${agentActions.detail}->>'href' = ${own.href}`,
          ),
        )
    ).flatMap((write) => {
      const detail = eventDetail.safeParse(write.detail).data;
      return detail ? [{ ...write, detail }] : [];
    });
    const later = writes
      .filter(
        (write) =>
          write.id !== row.id &&
          write.createdAt.getTime() > row.createdAt.getTime(),
      )
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (later.some((write) => write.undoneAt === null)) {
      throw new Refused("event-changed");
    }
    const next = later.at(0);
    if (
      next &&
      row.kind !== "delete_event" &&
      (next.detail.previous?.etag ?? null) !== (own.etag ?? null)
    ) {
      throw new Refused("event-changed");
    }
    let latest: { at: number; etag: string | null } | null = null;
    for (const { detail, ...write } of writes) {
      const seen = [
        { at: write.createdAt.getTime(), etag: detail.etag ?? null },
        ...(write.undoneAt && detail.undo
          ? [{ at: write.undoneAt.getTime(), etag: detail.undo.etag }]
          : []),
      ];
      for (const entry of seen) {
        if (!latest || entry.at >= latest.at) latest = entry;
      }
    }
    return latest?.etag ?? null;
  }

  async function undoMove(row: ActionRow) {
    const mailbox = await mailboxOf(row.accountId);
    const detail = mailDetail.safeParse(row.detail ?? {}).data ?? {};
    const from = row.fromFolder ?? "";
    const to = row.toFolder ?? "";
    if (!(await mailbox.has(from))) throw new Refused("folder-gone", from);
    const uid = await mailbox.find(to, row.messageId ?? "", {
      uidValidity: detail.toUidValidity,
      uid: detail.toUid,
    });
    if (uid === null) throw new Refused("mail-gone", to);
    await mailbox.session.moveMessages([uid], from);
  }

  async function undoFlag(row: ActionRow, kind: keyof typeof FLAG_UNDO) {
    const mailbox = await mailboxOf(row.accountId);
    const detail = mailDetail.safeParse(row.detail ?? {}).data ?? {};
    const { flag, set } = FLAG_UNDO[kind];
    const folder = row.fromFolder ?? "";
    const uid = await mailbox.find(folder, row.messageId ?? "", detail);
    if (uid === null) throw new Refused("mail-gone", folder);
    if (set) await mailbox.session.addFlags([uid], [flag]);
    else await mailbox.session.removeFlags([uid], [flag]);
  }

  async function undoFolder(row: ActionRow) {
    const mailbox = await mailboxOf(row.accountId);
    if (row.kind === "create_folder") {
      const path = row.toFolder ?? "";
      if (!(await mailbox.has(path))) return;
      if ((await mailbox.inside(path)).length > 0) {
        throw new Refused("folder-has-folders", path);
      }
      const folder = (await mailbox.folders()).find(
        (entry) => entry.path === path,
      );
      if (folder?.selectable) {
        await mailbox.select(path, false);
        if ((await mailbox.session.searchUids({})).length > 0) {
          throw new Refused("folder-not-empty", path);
        }
      }
      await mailbox.session.deleteEmptyFolder(path);
    } else if (row.kind === "rename_folder") {
      const old = row.fromFolder ?? "";
      const renamed = row.toFolder ?? "";
      const hasOld = await mailbox.has(old);
      const hasRenamed = await mailbox.has(renamed);
      if (hasOld && !hasRenamed) return;
      if (!hasRenamed) throw new Refused("folder-gone", renamed);
      if (hasOld) throw new Refused("folder-exists", old);
      await mailbox.session.renameFolder(renamed, old);
    } else {
      const path = row.fromFolder ?? "";
      if (await mailbox.has(path)) return;
      await mailbox.session.createFolder(path);
    }
    mailbox.folderChanged();
  }

  /** Returns the etag the event has after the undo, when it still exists. */
  async function undoEvent(row: ActionRow): Promise<string | null> {
    const detail = eventDetail.safeParse(row.detail).data;
    if (!detail) throw new Refused("failed");
    const session = await calendarOf(row.accountId);
    const current = await session.getEvent(detail.href);
    if (row.kind === "delete_event") {
      if (!detail.previous) throw new Refused("failed");
      if (current) throw new Refused("event-changed");
      await knownEtag(row, detail);
      const filename = decodeURIComponent(
        new URL(detail.href).pathname.split("/").at(-1) ?? "",
      );
      const created = await session.createEvent(
        detail.calendarUrl,
        filename,
        detail.previous.ics,
      );
      return (
        created.etag ?? (await session.getEvent(created.url))?.etag ?? null
      );
    }
    if (!current) {
      if (row.kind === "create_event") return null;
      throw new Refused("event-gone");
    }
    const known = await knownEtag(row, detail);
    if (known !== null && current.etag !== known) {
      throw new Refused("event-changed");
    }
    if (row.kind === "create_event") {
      await session.deleteEvent(detail.href, current.etag);
      return null;
    }
    if (!detail.previous) throw new Refused("failed");
    const written = await session.updateEvent(
      detail.href,
      detail.previous.ics,
      current.etag,
    );
    return written.etag ?? (await session.getEvent(detail.href))?.etag ?? null;
  }

  async function undoOne(row: ActionRow) {
    let detail = row.detail;
    switch (row.kind) {
      case "move":
        await undoMove(row);
        break;
      case "mark_read":
      case "mark_unread":
      case "flag":
      case "unflag":
        await undoFlag(row, row.kind);
        break;
      case "create_folder":
      case "rename_folder":
      case "delete_folder":
        await undoFolder(row);
        break;
      case "create_event":
      case "update_event":
      case "delete_event":
        detail = { ...row.detail, undo: { etag: await undoEvent(row) } };
        break;
    }
    await db
      .update(agentActions)
      .set({ undoneAt: now(), detail })
      .where(
        and(
          eq(agentActions.id, row.id),
          eq(agentActions.userId, userId),
          isNull(agentActions.undoneAt),
        ),
      );
  }

  const outcomes: UndoOutcome[] = [];
  try {
    for (const row of rows) {
      if (row.undoneAt) {
        outcomes.push({ actionId: row.id, undone: true });
        continue;
      }
      try {
        await undoOne(row);
        outcomes.push({ actionId: row.id, undone: true });
      } catch (error) {
        if (error instanceof Refused) {
          outcomes.push({
            actionId: row.id,
            undone: false,
            refusal: error.refusal,
            ...(error.folder === undefined ? {} : { folder: error.folder }),
          });
        } else {
          console.error(
            "Undo failed",
            row.kind,
            error instanceof Error ? error.message : String(error),
          );
          outcomes.push({ actionId: row.id, undone: false, refusal: "failed" });
        }
      }
    }
  } finally {
    for (const mailbox of mailboxes.values()) {
      await mailbox
        .then((opened) => opened.session.close())
        .catch(() => undefined);
    }
  }
  return outcomes;
}
