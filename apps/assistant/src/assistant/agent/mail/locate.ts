import type { FetchedMessage } from "#src/assistant/mail/imap/types.ts";
import { isSyntheticMessageId } from "#src/assistant/mail/parse/parse-mail.ts";
import { ToolRefusal } from "../agent-tool.ts";
import type { MailHandles, MailRef } from "./mail-handles.ts";
import type { HeldMailbox, RunMailboxes } from "./run-mailboxes.ts";

export interface Located {
  id: string;
  ref: MailRef;
  uid: number;
  message: FetchedMessage;
}

export interface Skipped {
  id: string;
  why: string;
}

export interface FolderGroup {
  folder: string;
  items: { id: string; ref: MailRef }[];
}

/** Ids by account. An unknown id refuses the whole call, before anything changes. */
export function byAccount(handles: MailHandles, ids: readonly string[]) {
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
export async function locate(
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
 * Runs `task` for the mail of each folder that the ids name, while the tool
 * holds the account. `check` sees every folder of the account first, so a
 * refusal comes before any change.
 */
export async function eachFolder(
  { mailboxes, handles }: { mailboxes: RunMailboxes; handles: MailHandles },
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

/** The count and the first mail of a call on several mails; a refusal for an unknown first id. */
export function mailsOf(handles: MailHandles, ids: readonly string[]) {
  const { subject, sender } = handles.get(ids[0]);
  return { count: new Set(ids).size, subject, sender };
}
