import type { MailProvider } from "#src/assistant/db/schema.ts";

const CONSUMER_OUTLOOK_DOMAINS = new Set([
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
]);

/**
 * A link that opens the mail in the user's own mail app or webmail: Apple
 * Mail by Message-ID, Gmail by an `rfc822msgid:` search, Outlook on the web
 * by a search for the sender and subject (it has no link by Message-ID).
 */
export function openOriginalHref({
  provider,
  accountAddress,
  messageId,
  fromAddress,
  subject,
}: {
  provider: MailProvider;
  accountAddress: string;
  /** With its angle brackets. */
  messageId: string;
  fromAddress: string | null;
  subject: string;
}): string {
  if (provider === "icloud") {
    return `message://${encodeURIComponent(messageId)}`;
  }
  if (provider === "gmail") {
    const bare = messageId.replace(/^<|>$/g, "");
    return `https://mail.google.com/mail/u/0/#search/rfc822msgid:${encodeURIComponent(bare)}`;
  }
  const domain = accountAddress.slice(accountAddress.lastIndexOf("@") + 1);
  const host = CONSUMER_OUTLOOK_DOMAINS.has(domain)
    ? "https://outlook.live.com"
    : "https://outlook.office.com";
  const query = [
    fromAddress ? `from:${fromAddress}` : "",
    subject ? `subject:"${subject.replaceAll('"', "")}"` : "",
  ]
    .filter(Boolean)
    .join(" ");
  return `${host}/mail/0/search?q=${encodeURIComponent(query)}`;
}
