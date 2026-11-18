import type { SupportedLocale } from "@tuja/i18n/types";
import "server-only";
import { z } from "zod";
import type { ReaderFile } from "#src/assistant/agent/reader/reader-agent.ts";
import { MAX_MESSAGE_CHARS } from "#src/assistant/agent/run-turn.ts";
import {
  MAX_ATTACHMENTS,
  MAX_TOTAL_BYTES,
  type AttachmentRefusal,
} from "#src/assistant/check-attachments.ts";

/** The text fields of a form are small; this leaves room for them and the form's own lines. */
const FORM_SLACK_BYTES = 256 * 1024;

const fields = z.strictObject({
  /** Null for a conversation that starts a new trip. */
  tripId: z.uuid().nullable(),
  text: z.string().max(MAX_MESSAGE_CHARS),
  /** The language of the person's screen; an unknown one counts as none. */
  locale: z.enum(["en", "zh"]).optional().catch(undefined),
});

export type SendBody =
  | {
      ok: true;
      tripId: string | null;
      text: string;
      files: ReaderFile[];
      locale?: SupportedLocale;
    }
  | { ok: false; error: "invalid_body" | AttachmentRefusal };

const encoder = new TextEncoder();

function startsWith(bytes: Uint8Array, prefix: string | number[], at = 0) {
  const expected = typeof prefix === "string" ? encoder.encode(prefix) : prefix;
  return expected.every((byte, index) => bytes[at + index] === byte);
}

/** The kind of a file from its first bytes; a declared type is not trusted. Null for a kind that is not taken. */
function sniff(
  bytes: Uint8Array,
  declared: string,
): Pick<ReaderFile, "kind" | "mediaType"> | null {
  if (startsWith(bytes, "%PDF-")) {
    return { kind: "pdf", mediaType: "application/pdf" };
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) {
    return { kind: "image", mediaType: "image/png" };
  }
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return { kind: "image", mediaType: "image/jpeg" };
  }
  if (startsWith(bytes, "GIF8")) {
    return { kind: "image", mediaType: "image/gif" };
  }
  if (startsWith(bytes, "RIFF") && startsWith(bytes, "WEBP", 8)) {
    return { kind: "image", mediaType: "image/webp" };
  }
  if (declared.split(";")[0].trim() === "text/plain") {
    try {
      new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      return { kind: "text", mediaType: "text/plain" };
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * The body of a sent message: JSON `{ tripId, text }`, or a form with the
 * fields `tripId` (left out for a new trip) and `text` and up to 4 files
 * under `file`. The limits of
 * the files are checked on their bytes.
 */
export async function readSendBody(request: Request): Promise<SendBody> {
  const type = request.headers.get("Content-Type") ?? "";
  if (!type.startsWith("multipart/form-data")) {
    const body = fields.safeParse(await request.json().catch(() => null));
    return body.success
      ? { ok: true, ...body.data, files: [] }
      : { ok: false, error: "invalid_body" };
  }
  const length = Number(request.headers.get("Content-Length") ?? "0");
  if (length > MAX_TOTAL_BYTES + FORM_SLACK_BYTES) {
    return { ok: false, error: "attachment_too_large" };
  }
  const form = await request.formData().catch(() => null);
  if (!form) return { ok: false, error: "invalid_body" };
  const body = fields.safeParse({
    tripId: form.get("tripId") || null,
    text: form.get("text") ?? "",
    locale: form.get("locale") ?? undefined,
  });
  if (!body.success) return { ok: false, error: "invalid_body" };
  const entries = form.getAll("file");
  if (entries.length > MAX_ATTACHMENTS) {
    return { ok: false, error: "too_many_attachments" };
  }
  const files: ReaderFile[] = [];
  let total = 0;
  for (const entry of entries) {
    if (typeof entry === "string") return { ok: false, error: "invalid_body" };
    total += entry.size;
    if (total > MAX_TOTAL_BYTES) {
      return { ok: false, error: "attachment_too_large" };
    }
    const data = new Uint8Array(await entry.arrayBuffer());
    const kind = sniff(data, entry.type);
    if (!kind) return { ok: false, error: "attachment_type" };
    files.push({ name: entry.name, ...kind, data });
  }
  return { ok: true, ...body.data, files };
}
