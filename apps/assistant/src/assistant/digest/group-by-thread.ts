import type { DigestSection } from "./types.ts";

/** One classified mail as the digest builder sees it. */
export interface DigestMail {
  classificationId: string;
  section: DigestSection;
  /** The RFC 5322 Message-ID, with its angle brackets. */
  messageId: string;
  inReplyTo: string | null;
  references: readonly string[];
  fromName: string | null;
  fromAddress: string | null;
  subject: string;
  /** The classifier's one line, or null. */
  summary: string | null;
  receivedAt: Date;
  /** `YYYY-MM-DD`. */
  dueDate: string | null;
  /** An open `act` item from an earlier digest. */
  carriedOver: boolean;
}

/** Mail of one thread in one section, newest first. */
export type MailThread = DigestMail[];

function newestFirst(a: DigestMail, b: DigestMail) {
  return b.receivedAt.getTime() - a.receivedAt.getTime();
}

/**
 * Puts mail of one section that shares a thread into one group: two mails
 * are in one thread when one names the other in In-Reply-To or References,
 * or both name the same earlier mail.
 */
export function groupByThread(mails: readonly DigestMail[]): MailThread[] {
  const parent = new Map<string, string>();
  function find(id: string): string {
    let root = id;
    for (let next = parent.get(root); next && next !== root;) {
      root = next;
      next = parent.get(root);
    }
    parent.set(id, root);
    return root;
  }
  function join(a: string, b: string) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent.set(rootB, rootA);
  }
  for (const mail of mails) {
    parent.set(mail.messageId, find(mail.messageId));
    for (const id of [mail.inReplyTo, ...mail.references]) {
      if (id) join(mail.messageId, id);
    }
  }
  const threads = new Map<string, DigestMail[]>();
  for (const mail of mails) {
    const key = `${mail.section} ${find(mail.messageId)}`;
    const thread = threads.get(key);
    if (thread) thread.push(mail);
    else threads.set(key, [mail]);
  }
  return [...threads.values()].map((thread) => thread.sort(newestFirst));
}

function earliestDueDate(thread: MailThread): string | null {
  const dates = thread.flatMap((mail) => (mail.dueDate ? [mail.dueDate] : []));
  return dates.length === 0 ? null : dates.sort()[0];
}

/**
 * The order of a section when the model does not arrange it. Act: the
 * nearest due date first, then the item that has waited longest. The other
 * sections: newest first.
 */
export function fallbackOrder(
  section: DigestSection,
  threads: readonly MailThread[],
): MailThread[] {
  const newest = (thread: MailThread) => thread[0].receivedAt.getTime();
  if (section !== "act") {
    return [...threads].sort((a, b) => newest(b) - newest(a));
  }
  return [...threads].sort((a, b) => {
    const dueA = earliestDueDate(a);
    const dueB = earliestDueDate(b);
    if (dueA !== dueB) {
      if (dueA === null) return 1;
      if (dueB === null) return -1;
      return dueA < dueB ? -1 : 1;
    }
    return newest(a) - newest(b);
  });
}
