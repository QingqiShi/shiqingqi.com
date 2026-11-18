import type { ModelMessage, TextPart } from "ai";
import "server-only";
import { messages, type NewMessage } from "#src/assistant/store/messages.ts";
import type { RefusalReason } from "#src/assistant/types.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";

/**
 * Something that happened after a turn, such as an accepted card. `text` is
 * what the model reads, written once when it happened, so that the history
 * that the model reads again stays the same to the byte.
 */
export type SegmentEvent =
  | {
      type: "change";
      changeId: string;
      decision: "accepted" | "skipped" | "undone" | "refused";
      /** Why a `refused` change could not apply. Events stored before it existed have none. */
      reason?: RefusalReason;
      text: string;
    }
  /** The person changed or deleted a memory file in the memory panel. */
  | {
      type: "memory";
      scope: "trip" | "personal";
      path: string;
      action: "changed" | "deleted";
      text: string;
    };

export type SegmentEntry =
  | { kind: "model"; seq: number; message: ModelMessage }
  | { kind: "event"; seq: number; event: SegmentEvent };

/** A model message, whole, with each part's `providerOptions`: the next turn sends it again as it is. */
function modelEntry(message: ModelMessage): NewMessage {
  return { kind: "model", message };
}

function eventEntry(event: SegmentEvent): NewMessage {
  return { kind: "event", message: event };
}

/** Only this module writes the rows, so a look at the shape is enough. */
function isModelMessage(value: unknown): value is ModelMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "role" in value &&
    "content" in value
  );
}

function isSegmentEvent(value: unknown): value is SegmentEvent {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    (value.type === "change" || value.type === "memory") &&
    "text" in value &&
    typeof value.text === "string"
  );
}

/** The messages and events of a segment of the viewer, in order. */
async function read(
  tx: Transaction,
  conversationId: string,
): Promise<SegmentEntry[]> {
  const rows = await messages.read(tx, conversationId);
  return rows.flatMap((row): SegmentEntry[] => {
    if (row.kind === "model" && isModelMessage(row.message)) {
      return [{ kind: "model", seq: row.seq, message: row.message }];
    }
    if (row.kind === "event" && isSegmentEvent(row.message)) {
      return [{ kind: "event", seq: row.seq, event: row.message }];
    }
    throw new Error(`Message ${String(row.seq)} has an unknown shape.`);
  });
}

/** The history that the model reads: each event becomes a short note from the app. */
function forModel(entries: readonly SegmentEntry[]): ModelMessage[] {
  return entries.map((entry) =>
    entry.kind === "model"
      ? entry.message
      : {
          role: "user",
          content: [
            {
              type: "text",
              text: `<app_event>${entry.event.text}</app_event>`,
            },
          ],
        },
  );
}

/**
 * The provider stores a compacted history as a text part too, marked
 * `compaction`. That is not something anyone said.
 */
function isCompaction(part: Pick<TextPart, "providerOptions">): boolean {
  const options = part.providerOptions;
  return (
    options !== undefined &&
    "anthropic" in options &&
    options.anthropic.type === "compaction"
  );
}

/** The texts that the person or the assistant said in a message. */
function spokenTexts(message: ModelMessage): string[] {
  if (typeof message.content === "string") return [message.content];
  if (message.role === "tool") return [];
  return message.content.flatMap((part) =>
    part.type === "text" && !isCompaction(part) ? [part.text] : [],
  );
}

/** A segment as the assistant stores and reads it. */
export const segmentMessages = {
  modelEntry,
  eventEntry,
  read,
  forModel,
  isCompaction,
  spokenTexts,
};
