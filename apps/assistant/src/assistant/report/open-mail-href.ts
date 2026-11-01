import type { MailProvider } from "#src/assistant/db/schema.ts";
import { isSyntheticMessageId } from "#src/assistant/mail/parse/parse-mail.ts";

const CONSUMER_OUTLOOK_DOMAINS = new Set([
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
]);

/**
 * A link that opens a mail in the owner's mail app or webmail, from its
 * Message-ID alone: Apple Mail by `message:`, Gmail by an `rfc822msgid:`
 * search. Outlook on the web has no link by Message-ID, and the app keeps
 * no sender or subject to search for, so the link opens the mailbox. Null
 * for a Message-ID the app made, which no search finds.
 */
export function openMailHref({
  provider,
  accountAddress,
  messageId,
}: {
  provider: MailProvider;
  accountAddress: string;
  /** With its angle brackets. */
  messageId: string;
}): string | null {
  if (provider === "outlook") {
    const domain = accountAddress.slice(accountAddress.lastIndexOf("@") + 1);
    return CONSUMER_OUTLOOK_DOMAINS.has(domain)
      ? "https://outlook.live.com/mail/0/"
      : "https://outlook.office.com/mail/";
  }
  if (isSyntheticMessageId(messageId)) return null;
  if (provider === "icloud") {
    return `message://${encodeURIComponent(messageId)}`;
  }
  const bare = messageId.replace(/^<|>$/g, "");
  return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(bare)}`;
}
