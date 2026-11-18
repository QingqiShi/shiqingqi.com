import type { SupportedLocale } from "@tuja/i18n/types";

/** A message longer than this is pasted content, which goes to the reader as an attachment and never into the assistant's own context. */
export const LONG_PASTE_CHARS = 2000;
export const MAX_ATTACHMENTS = 4;
export const MAX_PDF_BYTES = 3 * 1024 * 1024;
/** All files of one message together, under the server's limit for one request. */
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
/** The longest pasted text that the reader takes. */
export const MAX_PASTE_CHARS = 50_000;
/** The long edge of an image after the browser scales it down. */
export const IMAGE_LONG_EDGE = 1600;
export const MAX_NAME_CHARS = 80;

export type AttachmentKind = "image" | "pdf" | "text";

/** The name of a long text that became an attachment, in the person's language. */
export const PASTED_TEXT_NAMES = {
  en: "Pasted text",
  zh: "粘贴的文字",
} as const satisfies Record<SupportedLocale, string>;

export const READ_ITEM_KINDS = [
  "flight",
  "stay",
  "car_rental",
  "train",
  "dining",
  "place",
  "other",
] as const;

/** One thing that the reader found in a file, with every field capped. */
export interface ReadItem {
  kind: (typeof READ_ITEM_KINDS)[number];
  title: string;
  /** `YYYY-MM-DD` */
  date: string | null;
  /** `HH:mm` */
  time: string | null;
  endDate: string | null;
  endTime: string | null;
  place: string | null;
  reference: string | null;
  note: string | null;
  /** One short line copied from the file. */
  quote: string | null;
  /** The name of the file that it came from. */
  file: string;
}

export interface AttachmentFileInfo {
  name: string;
  kind: AttachmentKind;
  /** In bytes, as the server got it. */
  size: number;
}

/** What a message row keeps of its attachments: never the files or the pasted text. */
export interface StoredAttachments {
  status: "read" | "failed";
  files: AttachmentFileInfo[];
  items: ReadItem[];
}

/** Why the attachments of a message are refused. */
export type AttachmentRefusal =
  "too_many_attachments" | "attachment_too_large" | "attachment_type";

/** Checks the limits of a message's attachments; null when they fit. */
export function checkAttachments(
  files: readonly { kind: AttachmentKind; size: number; chars?: number }[],
): AttachmentRefusal | null {
  if (files.length > MAX_ATTACHMENTS) return "too_many_attachments";
  let total = 0;
  for (const file of files) {
    if (file.kind === "pdf" && file.size > MAX_PDF_BYTES) {
      return "attachment_too_large";
    }
    if (file.kind === "text" && (file.chars ?? 0) > MAX_PASTE_CHARS) {
      return "attachment_too_large";
    }
    total += file.size;
  }
  return total > MAX_TOTAL_BYTES ? "attachment_too_large" : null;
}

/** The text cut to at most `max` UTF-16 units, never in the middle of a surrogate pair. */
export function capChars(text: string, max: number): string {
  const capped = text.slice(0, max);
  return /[\uD800-\uDBFF]$/.test(capped) ? capped.slice(0, -1) : capped;
}

/**
 * A file name that is safe to show and to give to the model: one line, no
 * `<`, `>` or quote marks, and short.
 */
export function cleanName(name: string): string {
  const line = name
    .replace(/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}<>"`]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  return capChars(line, MAX_NAME_CHARS).trim() || "File";
}

/** The names of one message's files, each one different, so that a card can say which file it came from. */
export function uniqueNames(names: readonly string[]): string[] {
  const used = new Set<string>();
  return names.map((raw) => {
    const name = cleanName(raw);
    let candidate = name;
    for (let n = 2; used.has(candidate); n += 1) {
      candidate = `${name} (${String(n)})`;
    }
    used.add(candidate);
    return candidate;
  });
}
