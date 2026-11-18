import "server-only";
import { z } from "zod";
import { assistantPrompt } from "#src/assistant/agent/assistant-prompt.ts";
import { codeWork, type CodeWork } from "#src/assistant/agent/code-work.ts";
import { writtenText } from "#src/assistant/agent/memory-tool.ts";
import { CARD_ACTIONS } from "#src/assistant/agent/research/research-cards.ts";
import {
  cleanItem,
  listedUrls,
  shownCards,
} from "#src/assistant/agent/research/research-list.ts";
import {
  segmentMessages,
  type SegmentEntry,
} from "#src/assistant/agent/segment-messages.ts";
import type { StoredChange } from "#src/assistant/store/changes.ts";
import type {
  CardView,
  CreatedTrip,
  RefusalReason,
  TranscriptItem,
} from "#src/assistant/types.ts";

type ChangeItem = Extract<TranscriptItem, { type: "change" }>;
type CardsItem = Extract<TranscriptItem, { type: "cards" }>;
type RememberedItem = Extract<TranscriptItem, { type: "remembered" }>;

const MEMORY_DIRECTORIES = [
  ["/memories/trip/", "trip"],
  ["/memories/me/", "personal"],
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function record(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function summaryOf(change: StoredChange): string {
  const summary = record(change.card).summary;
  return typeof summary === "string" ? summary : "";
}

function fromFileOf(change: StoredChange): string | null {
  const fromFile = record(change.card).fromFile;
  return typeof fromFile === "string" ? fromFile : null;
}

function dayIdsOf(change: StoredChange): string[] {
  const dayIds = record(change.card).dayIds;
  return Array.isArray(dayIds)
    ? dayIds.filter((id): id is string => typeof id === "string")
    : [];
}

function changeItem(
  change: StoredChange,
  refusals: ReadonlyMap<string, RefusalReason>,
): ChangeItem | null {
  if (change.parentId !== null) return null;
  if (change.kind !== "applied" && change.kind !== "proposal") return null;
  const fromFile = fromFileOf(change);
  return {
    ...(fromFile !== null && { fromFile }),
    ...(change.status === "refused" && {
      refusal: refusals.get(change.id) ?? "trip_changed",
    }),
    type: "change",
    key: `change:${change.id}`,
    changeId: change.id,
    kind: change.kind,
    status: change.status,
    summary: summaryOf(change),
    dayIds: dayIdsOf(change),
    canUndo:
      (change.status === "applied" || change.status === "accepted") &&
      change.inverseOps !== null,
  };
}

/** The cards of a `show_cards` call, each with the newest result of each button. */
function cardsItem(
  change: StoredChange,
  changeRows: readonly StoredChange[],
): CardsItem | null {
  if (change.kind !== "research") return null;
  const parsed = shownCards.safeParse(change.card);
  if (!parsed.success) return null;
  const children = changeRows.filter((row) => row.parentId === change.id);
  return {
    type: "cards",
    key: `cards:${change.id}`,
    changeId: change.id,
    cards: parsed.data.cards.flatMap((shown) => {
      const card = cleanItem(shown);
      if (!card) return [];
      const actions: CardView["actions"] = {};
      for (const action of CARD_ACTIONS) {
        const newest = children
          .filter((row) => row.actionKey?.startsWith(`${card.id}:${action}:`))
          .at(-1);
        if (!newest) continue;
        actions[action] = {
          changeId: newest.id,
          status: newest.status,
          dayId: dayIdsOf(newest)[0] ?? "",
          canUndo: newest.status === "applied" && newest.inverseOps !== null,
        };
      }
      return [{ ...card, actions }];
    }),
  };
}

function memoryLocation(raw: unknown) {
  if (typeof raw !== "string") return null;
  for (const [directory, scope] of MEMORY_DIRECTORIES) {
    if (raw.startsWith(directory) && raw.length > directory.length) {
      return { scope, path: raw.slice(directory.length) };
    }
  }
  return null;
}

/** The memory write of a call, when its result says it worked. */
function remembered(
  key: string,
  input: Record<string, unknown>,
  result: unknown,
): RememberedItem | null {
  const answer = record(result);
  if (answer.type !== "text" || typeof answer.value !== "string") return null;
  if (answer.value.startsWith("Error:")) return null;
  const command = input.command;
  const action =
    command === "create" || command === "str_replace" || command === "insert"
      ? "written"
      : command === "delete"
        ? "deleted"
        : command === "rename"
          ? "renamed"
          : null;
  if (action === null) return null;
  const location = memoryLocation(
    action === "renamed" ? input.new_path : input.path,
  );
  const text = writtenText(input);
  return (
    location && {
      type: "remembered",
      key,
      action,
      ...location,
      ...(text !== undefined && { text }),
    }
  );
}

const createdTripSchema = z.object({
  created: z.literal(true),
  tripId: z.uuid(),
  title: z.string(),
  firstDate: z.string(),
  lastDate: z.string(),
  days: z.array(z.object({ date: z.string(), line: z.string() })),
});

/** The trip that a `create_trip` call made, from the result that the server gave it. */
function createdTrip(result: unknown): CreatedTrip | null {
  const answer = record(result);
  if (answer.type !== "json") return null;
  const parsed = createdTripSchema.safeParse(answer.value);
  if (!parsed.success) return null;
  const { tripId, title, firstDate, lastDate, days } = parsed.data;
  return { tripId, title, firstDate, lastDate, days };
}

/**
 * What a UI draws of a segment, in order: the person's and the assistant's
 * texts, a line per tool call, a card per change with its status now, a
 * question, a line per memory write, and the person's later decisions. No
 * reasoning and no tool payloads. A change whose message was not stored,
 * as in a turn that stopped, comes at the end, so that its Undo still shows.
 */
function build(
  entries: readonly SegmentEntry[],
  changeRows: readonly StoredChange[],
): TranscriptItem[] {
  const byToolCall = new Map(
    changeRows.flatMap((change) =>
      change.toolCallId === null ? [] : [[change.toolCallId, change] as const],
    ),
  );
  const byId = new Map(changeRows.map((change) => [change.id, change]));
  const refusals = new Map<string, RefusalReason>();
  const results = new Map<string, unknown>();
  for (const entry of entries) {
    if (
      entry.kind === "event" &&
      entry.event.type === "change" &&
      entry.event.decision === "refused"
    ) {
      refusals.set(entry.event.changeId, entry.event.reason ?? "trip_changed");
    }
    if (entry.kind !== "model" || entry.message.role !== "tool") continue;
    for (const part of entry.message.content) {
      if (part.type === "tool-result")
        results.set(part.toolCallId, part.output);
    }
  }

  const items: TranscriptItem[] = [];
  const shown = new Set<string>();
  /** The index of the turn's one line for skills and code, once it has one. */
  let workedAt = -1;
  const addWorked = (key: string, work: CodeWork) => {
    const line = items.at(workedAt);
    if (workedAt !== -1 && line?.type === "worked") {
      items[workedAt] = { ...line, work: codeWork.stronger(line.work, work) };
      return;
    }
    workedAt = items.length;
    items.push({ type: "worked", key, work });
  };
  const addText = (type: "member" | "assistant", key: string, text: string) => {
    if (text.trim() === "") return;
    const last = items.at(-1);
    if (type === "assistant" && last?.type === "assistant") {
      items[items.length - 1] = { ...last, text: `${last.text}\n\n${text}` };
    } else {
      items.push({ type, key, text });
    }
  };

  for (const entry of entries) {
    if (entry.kind === "event") {
      if (entry.event.type !== "change") continue;
      const change = byId.get(entry.event.changeId);
      // The card itself shows what became of its buttons.
      if (change?.parentId) continue;
      items.push({
        type: "event",
        key: String(entry.seq),
        changeId: entry.event.changeId,
        decision: entry.event.decision,
        summary: change ? summaryOf(change) : "",
      });
      continue;
    }
    const { message } = entry;
    if (message.role === "user") {
      workedAt = -1;
      const text = segmentMessages
        .spokenTexts(message)
        .map(assistantPrompt.personText)
        .join("\n\n");
      const stored = entry.attachments;
      if (stored && stored.files.length > 0) {
        items.push({
          type: "member",
          key: String(entry.seq),
          text: text.trim(),
          attachments: stored.files.map(({ name, kind }) => ({
            name,
            kind,
            state: stored.status,
          })),
        });
      } else {
        addText("member", String(entry.seq), text);
      }
      continue;
    }
    if (message.role !== "assistant") continue;
    const parts =
      typeof message.content === "string"
        ? [{ type: "text" as const, text: message.content }]
        : message.content;
    parts.forEach((part, i) => {
      const key = `${String(entry.seq)}:${String(i)}`;
      if (part.type === "text") {
        if (!segmentMessages.isCompaction(part)) {
          addText("assistant", key, part.text);
        }
        return;
      }
      if (part.type !== "tool-call") return;
      if (part.toolName === codeWork.toolName) {
        addWorked(key, codeWork.of(part.input));
        return;
      }
      const input = record(part.input);
      const change = byToolCall.get(part.toolCallId);
      const card =
        change &&
        (changeItem(change, refusals) ?? cardsItem(change, changeRows));
      if (card) {
        shown.add(card.changeId);
        items.push(card);
        return;
      }
      if (
        part.toolName === "ask_person" &&
        typeof input.question === "string"
      ) {
        items.push({
          type: "question",
          key,
          question: input.question,
          options: Array.isArray(input.options)
            ? input.options.filter((o): o is string => typeof o === "string")
            : [],
        });
        return;
      }
      if (part.toolName === "create_trip") {
        const made = createdTrip(results.get(part.toolCallId));
        if (made) {
          items.push({ type: "trip", key, ...made });
          return;
        }
      }
      if (part.toolName === "memory") {
        const line = remembered(key, input, results.get(part.toolCallId));
        if (line) {
          items.push(line);
          return;
        }
      }
      items.push({ type: "tool", key, tool: part.toolName });
    });
  }

  for (const change of changeRows) {
    if (shown.has(change.id)) continue;
    const card = changeItem(change, refusals) ?? cardsItem(change, changeRows);
    if (card) items.push(card);
  }
  return items;
}

/** The web addresses that may show as links in the segment: those of its research lists. */
function links(changeRows: readonly StoredChange[]): string[] {
  return [
    ...listedUrls(
      changeRows.flatMap((row) => (row.kind === "research" ? [row.card] : [])),
    ),
  ];
}

/** The display transcript of a stored segment. */
export const transcript = { build, links };
