import { isSyntheticMessageId } from "#src/assistant/mail/parse/parse-mail.ts";

const MESSAGE_ID = /^<[^<>\s]+>$/;

/**
 * The page that shows a mail in the app, without a locale. The Message-ID,
 * angle brackets included, is base64url in one path segment, because it can
 * hold `/`, `%` and other characters that a path does not keep as they are.
 * Null for a Message-ID the app made, which no search on the server finds.
 */
export function mailViewPath(accountId: string, messageId: string) {
  if (isSyntheticMessageId(messageId)) return null;
  return `/mail/${encodeURIComponent(accountId)}/${Buffer.from(messageId).toString("base64url")}`;
}

export function messageIdOfSegment(segment: string) {
  const messageId = Buffer.from(segment, "base64url").toString("utf8");
  return MESSAGE_ID.test(messageId) && !isSyntheticMessageId(messageId)
    ? messageId
    : null;
}
