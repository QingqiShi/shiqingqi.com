import { openMailHref } from "#src/assistant/report/open-mail-href.ts";
import type { MailHandles } from "../mail/mail-handles.ts";
import type { RunMailboxes } from "../mail/run-mailboxes.ts";
import type { SourceMail } from "./create-calendar-tools.ts";

/** The mail of a run id such as `m12`; a refusal for an id the run does not know. */
export function sourceMailOf(
  mailboxes: Pick<RunMailboxes, "accounts">,
  handles: MailHandles,
  id: string,
): SourceMail {
  const ref = handles.get(id);
  const account = mailboxes.accounts.find(
    (entry) => entry.key === ref.accountKey,
  );
  return {
    messageId: ref.messageId,
    subject: ref.subject,
    sender: ref.sender,
    href: account
      ? openMailHref({
          provider: account.provider,
          accountAddress: account.address,
          messageId: ref.messageId,
        })
      : null,
  };
}
