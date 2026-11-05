import {
  parseMailSafely,
  type ParsedMail,
} from "#src/assistant/mail/parse/parse-mail.ts";
import {
  addDays,
  localDayBounds,
} from "#src/assistant/report/local-day-bounds.ts";
import { ToolRefusal } from "../agent-tool.ts";
import { FLAGGED, SEEN } from "./constants.ts";
import type { MailHandles } from "./mail-handles.ts";
import type { RunMailboxes } from "./run-mailboxes.ts";

/** The headers and the start of the text: enough for the envelope and the list headers. */
const HEADER_BYTES = 16 * 1024;

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

export interface ListMailInput {
  account: string;
  folder: string;
  unreadOnly?: boolean;
  since?: string;
  before?: string;
  order?: "oldest" | "newest";
  limit?: number;
  cursor?: string;
}

/** A `since` or `before` of `ListMailInput`: an exact time as it is, a day from its start in `timeZone`. */
function instantOf(bound: string, timeZone: string) {
  return bound.includes("T")
    ? new Date(bound)
    : localDayBounds(bound, timeZone).start;
}

/** The UTC date of `instant`, moved by `days`, for an IMAP search. */
function searchDate(instant: Date, days: number) {
  return new Date(
    `${addDays(instant.toISOString().slice(0, 10), days)}T00:00:00Z`,
  );
}

/**
 * One page of the mail of a folder, by its headers; gives each mail an id
 * in `handles`. What `list_mail` returns, and what code that lists mail
 * outside the model calls.
 */
export function listMail(
  {
    mailboxes,
    handles,
    timeZone,
  }: { mailboxes: RunMailboxes; handles: MailHandles; timeZone: string },
  input: ListMailInput,
) {
  return mailboxes.use(input.account, async (mailbox) => {
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
    const from = input.since ? instantOf(input.since, timeZone) : null;
    const until = input.before ? instantOf(input.before, timeZone) : null;
    const all = await mailbox.session.searchUids({
      // IMAP compares dates only, in the server's zone, which can show a date
      // one day from the UTC date. BEFORE leaves out its own date.
      since: from ? searchDate(from, -1) : undefined,
      before: until ? searchDate(until, 2) : undefined,
      seen: input.unreadOnly ? false : undefined,
    });
    const inRange = (mail: ParsedMail) =>
      (from === null || mail.receivedAt >= from) &&
      (until === null || mail.receivedAt < until);
    const ordered = newest ? [...all].reverse() : all;
    const rest =
      after === null
        ? ordered
        : ordered.filter((uid) => (newest ? uid < after : uid > after));
    const limit = input.limit ?? 25;
    const page = rest.slice(0, limit);
    const fetched = await mailbox.session.fetchMessages(page, HEADER_BYTES);
    const mails = await Promise.all(fetched.map(parseMailSafely));
    const byUid = new Map(mails.map((mail) => [mail.uid, mail]));
    const listed = page.flatMap((uid) => {
      const mail = byUid.get(uid);
      if (!mail || !inRange(mail)) return [];
      const id = handles.register({
        accountKey: mailbox.account.key,
        folder: folder.path,
        uidValidity,
        uid,
        messageId: mail.messageId,
        subject: mail.subject,
        sender: senderOf(mail),
        receivedAt: mail.receivedAt,
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
      // The search holds more than the bounds at each end, so with bounds
      // the count is not exact.
      total: from === null && until === null ? all.length : undefined,
      mails: listed,
      nextCursor:
        rest.length > page.length && last !== undefined
          ? `${String(uidValidity)}:${String(last)}`
          : null,
    };
  });
}
