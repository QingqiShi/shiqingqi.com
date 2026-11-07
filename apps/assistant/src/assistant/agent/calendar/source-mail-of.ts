import { mailViewPath } from "#src/assistant/mail/view/mail-view-path.ts";
import { BASE_URL } from "#src/constants.ts";
import type { MailHandles } from "../mail/mail-handles.ts";
import type { RunMailboxes } from "../mail/run-mailboxes.ts";
import type { SourceMail } from "./types.ts";

/**
 * The mail of a run id such as `m12`; a refusal for an id the run does not
 * know. The link goes in the event, which other apps show, so it is the full
 * URL of the app's mail page.
 */
export function sourceMailOf(
  mailboxes: Pick<RunMailboxes, "accounts">,
  handles: MailHandles,
  id: string,
): SourceMail {
  const ref = handles.get(id);
  const account = mailboxes.accounts.find(
    (entry) => entry.key === ref.accountKey,
  );
  const path = account ? mailViewPath(account.id, ref.messageId) : null;
  return {
    messageId: ref.messageId,
    subject: ref.subject,
    sender: ref.sender,
    href: path ? `${BASE_URL}${path}` : null,
  };
}
