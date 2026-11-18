import type { ModelMessage, TextPart } from "ai";
import "server-only";
import { z } from "zod";
import {
  READ_ITEM_KINDS,
  type StoredAttachments,
} from "#src/assistant/check-attachments.ts";
import { messages, type NewMessage } from "#src/assistant/store/messages.ts";
import type { RefusalReason } from "#src/assistant/types.ts";
import type { Transaction } from "#src/trips/as-viewer.ts";
import { assistantPrompt } from "./assistant-prompt.ts";

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
  /** The person tapped a button on a research card, which saved `changeId`. */
  | {
      type: "card";
      changeId: string;
      action: "add" | "backup";
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
  | {
      kind: "model";
      seq: number;
      message: ModelMessage;
      /** The files of a person's message, with what the reader found in them. */
      attachments: StoredAttachments | null;
    }
  | { kind: "event"; seq: number; event: SegmentEvent };

/** A model message, whole, with each part's `providerOptions`: the next turn sends it again as it is. */
function modelEntry(
  message: ModelMessage,
  attachments?: StoredAttachments,
): NewMessage {
  return { kind: "model", message, attachments };
}

const nullableText = z.string().nullable();

const storedAttachments: z.ZodType<StoredAttachments> = z.object({
  status: z.enum(["read", "failed"]),
  files: z.array(
    z.object({
      name: z.string(),
      kind: z.enum(["image", "pdf", "text"]),
      size: z.number(),
    }),
  ),
  items: z.array(
    z.object({
      kind: z.enum(READ_ITEM_KINDS),
      title: z.string(),
      date: nullableText,
      time: nullableText,
      endDate: nullableText,
      endTime: nullableText,
      place: nullableText,
      reference: nullableText,
      note: nullableText,
      quote: nullableText,
      file: z.string(),
    }),
  ),
});

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
    (value.type === "change" ||
      value.type === "card" ||
      value.type === "memory") &&
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
      const attachments = storedAttachments.safeParse(row.attachments);
      return [
        {
          kind: "model",
          seq: row.seq,
          message: row.message,
          attachments: attachments.success ? attachments.data : null,
        },
      ];
    }
    if (row.kind === "event" && isSegmentEvent(row.message)) {
      return [{ kind: "event", seq: row.seq, event: row.message }];
    }
    throw new Error(`Message ${String(row.seq)} has an unknown shape.`);
  });
}

/** The history that the model reads: each event becomes a short note from the app. */
function forModel(entries: readonly SegmentEntry[]): ModelMessage[] {
  return withoutOpenServerCalls(
    entries.map((entry) =>
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
    ),
  );
}

/**
 * A code run that the model starts next to a question to the person ends in
 * the step after the question, which never comes. Its container is gone in
 * the next turn, so the history drops the call that has no result.
 */
function withoutOpenServerCalls(history: ModelMessage[]): ModelMessage[] {
  const ended = new Set(
    history.flatMap((message) =>
      message.role === "assistant" && typeof message.content !== "string"
        ? message.content.flatMap((part) =>
            part.type === "tool-result" ? [part.toolCallId] : [],
          )
        : [],
    ),
  );
  return history.flatMap((message): ModelMessage[] => {
    if (message.role !== "assistant" || typeof message.content === "string") {
      return [message];
    }
    const content = message.content.filter(
      (part) =>
        !(
          part.type === "tool-call" &&
          part.providerExecuted === true &&
          !ended.has(part.toolCallId)
        ),
    );
    if (content.length === message.content.length) return [message];
    return content.length > 0 ? [{ ...message, content }] : [];
  });
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

/** The texts that the person or the assistant said in a message: not the app's block of attachment items. */
function spokenTexts(message: ModelMessage): string[] {
  if (typeof message.content === "string") return [message.content];
  if (message.role === "tool") return [];
  const isUser = message.role === "user";
  return message.content.flatMap((part, index) =>
    part.type === "text" &&
    !isCompaction(part) &&
    !(isUser && index > 0 && assistantPrompt.isAttachmentBlock(part.text))
      ? [part.text]
      : [],
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
