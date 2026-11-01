import { createHash } from "node:crypto";
import PostalMime from "postal-mime";
import type {
  FetchedMessage,
  MailAddress,
} from "#src/assistant/mail/imap/types.ts";
import { cleanSnippet } from "./clean-snippet.ts";
import { htmlToText } from "./html-to-text.ts";

/** What sync stores of one mail. */
export interface ParsedMail {
  uid: number;
  /** In angle brackets. A mail without one gets an id made from its headers. */
  messageId: string;
  inReplyTo: string | null;
  references: string[];
  fromAddress: string | null;
  fromName: string | null;
  replyTo: string | null;
  toAddresses: string[];
  ccAddresses: string[];
  subject: string;
  sentAt: Date | null;
  receivedAt: Date;
  flags: string[];
  listId: string | null;
  listUnsubscribe: string | null;
  autoSubmitted: string | null;
  precedence: string | null;
  size: number | null;
  snippet: string;
}

const MESSAGE_ID = /<[^<>\s]+>/g;
/** A longer Message-ID is stored as its hash: the unique index on it holds about 2,700 bytes. */
const MESSAGE_ID_MAX_BYTES = 998;
const SYNTHETIC_DOMAIN = "@no-message-id.invalid>";

/** The text as Postgres stores it: `text` refuses NUL, and UTF-8 has no lone surrogates. */
function storable(value: string): string {
  return value.replaceAll("\u0000", "").toWellFormed();
}

function storableOrNull(value: string | null | undefined): string | null {
  return value === null || value === undefined ? null : storable(value);
}

/** An id that stands for a Message-ID the app cannot store as it is. No search on the server finds it. */
export function hashedMessageId(messageId: string): string {
  const digest = createHash("sha256").update(messageId).digest("hex");
  return `<${digest}${SYNTHETIC_DOMAIN}`;
}

function bounded(messageId: string): string {
  return Buffer.byteLength(messageId) > MESSAGE_ID_MAX_BYTES
    ? hashedMessageId(messageId)
    : messageId;
}

function messageIdsOf(value: string | null | undefined): string[] {
  return (value ? storable(value).match(MESSAGE_ID) : null)?.map(bounded) ?? [];
}

function normaliseMessageId(value: string | null | undefined): string | null {
  const [id] = messageIdsOf(value);
  if (id) return id;
  const bare =
    value === null || value === undefined ? "" : storable(value).trim();
  return bare && !/\s/.test(bare) ? bounded(`<${bare}>`) : null;
}

function addressesOf(list: MailAddress[]): string[] {
  return list.flatMap((entry) =>
    entry.address ? [storable(entry.address.toLowerCase())] : [],
  );
}

function syntheticMessageId(message: FetchedMessage, headerBlock: string) {
  const digest = createHash("sha256").update(headerBlock).digest("hex");
  return `<${digest.slice(0, 32)}.${String(message.size ?? 0)}${SYNTHETIC_DOMAIN}`;
}

/** True for an id the app made, for a mail without a usable Message-ID: no search on the server finds it. */
export function isSyntheticMessageId(messageId: string) {
  return messageId.endsWith(SYNTHETIC_DOMAIN);
}

function headerBlockOf(source: Uint8Array): string {
  const text = new TextDecoder().decode(source);
  const end = text.search(/\r?\n\r?\n/);
  return end === -1 ? text : text.slice(0, end);
}

/**
 * Reads a fetched mail. The envelope that the server parsed wins over the
 * headers in the source, which can be cut off; the snippet comes from the
 * text part, or else the HTML part, of the first bytes of the source.
 */
export async function parseMail(message: FetchedMessage): Promise<ParsedMail> {
  const parsed = await PostalMime.parse(message.source);
  const header = (name: string) =>
    storableOrNull(
      parsed.headers.find((entry) => entry.key === name)?.value.trim() || null,
    );
  const { envelope } = message;
  const from = envelope.from.at(0) ?? null;
  const body = parsed.text?.trim()
    ? parsed.text
    : parsed.html
      ? htmlToText(parsed.html)
      : "";

  return {
    uid: message.uid,
    messageId:
      normaliseMessageId(envelope.messageId) ??
      normaliseMessageId(parsed.messageId) ??
      syntheticMessageId(message, headerBlockOf(message.source)),
    inReplyTo:
      normaliseMessageId(envelope.inReplyTo) ??
      normaliseMessageId(parsed.inReplyTo),
    references: messageIdsOf(parsed.references),
    fromAddress: storableOrNull(from?.address?.toLowerCase()),
    fromName: storableOrNull(from?.name),
    replyTo: storableOrNull(envelope.replyTo.at(0)?.address?.toLowerCase()),
    toAddresses: addressesOf(envelope.to),
    ccAddresses: addressesOf(envelope.cc),
    subject: storable(envelope.subject ?? parsed.subject ?? ""),
    sentAt:
      envelope.date ??
      (parsed.date && !Number.isNaN(Date.parse(parsed.date))
        ? new Date(parsed.date)
        : null),
    receivedAt: message.internalDate ?? envelope.date ?? new Date(),
    flags: message.flags.map(storable),
    listId: header("list-id"),
    listUnsubscribe: header("list-unsubscribe"),
    autoSubmitted: header("auto-submitted"),
    precedence: header("precedence"),
    size: message.size,
    snippet: storable(cleanSnippet(body)),
  };
}

/** `parseMail`, but a source that does not parse keeps the envelope, so that it never stops a cursor. */
export async function parseMailSafely(
  message: FetchedMessage,
): Promise<ParsedMail> {
  try {
    return await parseMail(message);
  } catch {
    return parseMail({ ...message, source: new Uint8Array() });
  }
}
