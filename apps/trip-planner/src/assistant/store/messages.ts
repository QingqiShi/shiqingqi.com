import { asc, eq, sql } from "drizzle-orm";
import "server-only";
import { assistantMessages } from "#src/db/schema.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";
import { callFunction, jsonb } from "./call-function.ts";

export interface NewMessage {
  /** `model`: a message as the model SDK gave it. `event`: a later event, such as an accepted card. */
  kind: "model" | "event";
  message: unknown;
  /** The names of attached files and the items read from them; never the files. */
  attachments?: unknown;
}

export interface StoredMessage {
  seq: number;
  kind: "model" | "event";
  /** As it was given, with its keys in the same order. */
  message: unknown;
  attachments: unknown;
  turnId: string | null;
  createdAt: Date;
}

/**
 * The text of the JSON, kept as a `jsonb` string. A `jsonb` object would
 * sort its keys, which changes the prefix that the model's cache compares,
 * and it refuses `\u0000` and a lone surrogate.
 */
function encode(value: unknown): string | null {
  return value === undefined || value === null ? null : JSON.stringify(value);
}

function decode(value: unknown): unknown {
  return typeof value === "string" ? JSON.parse(value) : value;
}

/** The messages of a segment of the viewer, in order. Row-level security gives no rows of another user. */
async function read(
  tx: Transaction,
  conversationId: string,
): Promise<StoredMessage[]> {
  const rows = await tx
    .select({
      seq: assistantMessages.seq,
      kind: assistantMessages.kind,
      message: assistantMessages.message,
      attachments: assistantMessages.attachments,
      turnId: assistantMessages.turnId,
      createdAt: assistantMessages.createdAt,
    })
    .from(assistantMessages)
    .where(eq(assistantMessages.conversationId, conversationId))
    .orderBy(asc(assistantMessages.seq));
  return rows.map((row) => ({
    ...row,
    message: decode(row.message),
    attachments: decode(row.attachments),
  }));
}

/**
 * Adds messages to the end of a segment of the viewer and gives the `seq`
 * of the first. A running turn passes its own id, and can add to its
 * segment after the segment ended. Null while another turn holds the
 * segment, and for a `model` message in an ended segment that no running
 * turn holds; an `event` goes into an ended segment too. A message over
 * 1 MiB throws.
 */
async function append(
  tx: Transaction,
  conversationId: string,
  turnId: string | null,
  newMessages: readonly NewMessage[],
): Promise<number | null> {
  if (newMessages.length === 0) return null;
  const encoded = newMessages.map(({ kind, message, attachments }) => ({
    kind,
    message: encode(message),
    attachments: encode(attachments),
  }));
  return callFunction<number | null>(
    tx,
    sql`public.assistant_append_messages(${conversationId}::uuid, ${turnId}::uuid, ${jsonb(encoded)})`,
  );
}

/** The messages of a segment. Rows are only added, never changed. */
export const messages = { read, append };
