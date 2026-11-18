import type { CodeWork } from "./agent/code-work.ts";
import type { CardAction } from "./agent/research/research-cards.ts";
import type { ResearchCard } from "./agent/research/research-list.ts";
import type { CreatedTrip } from "./agent/trip-view.ts";
import type { TurnEvent, TurnStatus } from "./agent/turn-events.ts";
import type { AttachmentKind } from "./check-attachments.ts";
import type { ChangeStatus } from "./store/changes.ts";

export type { CardAction, ChangeStatus, CreatedTrip, ResearchCard, TurnEvent };

/** What a button on a card saved, as a change that the person can undo. */
export interface CardActionView {
  changeId: string;
  status: ChangeStatus;
  dayId: string;
  canUndo: boolean;
}

/** A research card, with the newest result of each of its buttons. */
export type CardView = ResearchCard & {
  actions: Partial<Record<CardAction, CardActionView>>;
};

/** A day of the trip, for the day picker of a card. */
export interface DayChoice {
  id: string;
  /** The number that the reader shows. */
  number: number;
  date: string;
}

/**
 * A file of a person's message: `reading` while the reader works on it,
 * `failed` when it could not be read.
 */
export interface AttachmentChip {
  name: string;
  kind: AttachmentKind;
  state: "reading" | "read" | "failed";
}

/**
 * Why a proposal could not be saved when the person accepted it:
 * `trip_changed`, a thing that it changes was changed since;
 * `no_longer_fits`, its changes cannot apply to the trip as it is now.
 */
export type RefusalReason = "trip_changed" | "no_longer_fits";

/**
 * One thing to draw in a conversation, in order. `key` is stable for a
 * stored segment. Texts are plain text from the person or the model: render
 * them as text, never as HTML.
 */
export type TranscriptItem =
  /** What the person wrote, without the app's lines, and the files that they attached. */
  | {
      type: "member";
      key: string;
      text: string;
      attachments?: AttachmentChip[];
    }
  | { type: "assistant"; key: string; text: string }
  /** A compact line for one tool call, such as `read_trip` or `memory`, or a change that the server refused. */
  | {
      type: "tool";
      key: string;
      tool: string;
      /** Only in a turn that streams now: the call has not ended. */
      running?: boolean;
    }
  /**
   * A change that the assistant saved (`applied`) or proposed (`proposal`),
   * with its status now. `canUndo`: show Undo. A pending proposal shows
   * Accept and Skip.
   */
  | {
      type: "change";
      key: string;
      changeId: string;
      kind: "applied" | "proposal";
      status: ChangeStatus;
      summary: string;
      dayIds: string[];
      canUndo: boolean;
      /** Why it is `refused`, when it is. */
      refusal?: RefusalReason;
      /** The attached file that the change came from, as the server checked it. */
      fromFile?: string;
    }
  /** A question with options to tap; a tap sends the option as the person's next message. */
  | { type: "question"; key: string; question: string; options: string[] }
  /** The assistant wrote to, deleted from or renamed a memory file. `path` is in its scope, such as `preferences.md`. */
  | {
      type: "remembered";
      key: string;
      scope: "trip" | "personal";
      path: string;
      action: "written" | "deleted" | "renamed";
      /** The start of the text that was written, on one line. */
      text?: string;
    }
  /** The one quiet line of a turn in which the assistant read a skill or ran code. */
  | { type: "worked"; key: string; work: CodeWork }
  /** Cards of research items, with what the person did with each. */
  | { type: "cards"; key: string; changeId: string; cards: CardView[] }
  /** The trip that the assistant made in this conversation, as it was then. */
  | ({ type: "trip"; key: string } & CreatedTrip)
  /** The person decided on a change, after the turn that made it. */
  | {
      type: "event";
      key: string;
      changeId: string;
      decision: "accepted" | "skipped" | "undone" | "refused";
      summary: string;
    };

export interface SegmentInfo {
  id: string;
  startedAt: string;
  /** Null for a segment with no message yet. */
  lastMessageAt: string | null;
  /** Null while it is the open segment. */
  endedAt: string | null;
  /** A few sentences, or null until the segment ends (or when the summary failed). */
  summary: string | null;
}

export interface AssistantState {
  /** The open segment, or null when the person has none in this trip yet. */
  segment: SegmentInfo | null;
  transcript: TranscriptItem[];
  /** A turn of the person runs in this trip now: poll again, and send nothing. */
  running: boolean;
  /** The trip's version now, as `digest(trip)` gives it in the browser; null where there is no trip yet. */
  version: string | null;
  /** The web addresses of the segment's research lists: only these show as links in the assistant's text. */
  links: string[];
  /** The days of the trip, to add a card to. */
  days: DayChoice[];
}

export interface SegmentTranscript {
  segment: SegmentInfo;
  transcript: TranscriptItem[];
  running: boolean;
  links: string[];
}

/** One line of the stream of a sent message. The first is `started`; the last is `done`. */
export type StreamLine =
  { type: "started"; conversationId: string; turnId: string } | TurnEvent;

/** Why the last message did not get a full answer: how its turn ended, or why it did not start. */
export type SendFailure =
  | Exclude<TurnStatus, "ok">
  | "too_long"
  | "busy"
  | "attachments"
  | "request_failed";

export type MemoryScopeName = "trip" | "personal";

export interface MemoryFile {
  /** In its scope, such as `preferences.md`. */
  path: string;
  content: string;
  updatedAt: string;
}

export interface MemoryLists {
  /** The trip's memory, which every member reads. */
  trip: MemoryFile[];
  /** The person's own memory, across all trips. */
  personal: MemoryFile[];
}

export type DecideOutcome =
  | { status: "done"; version?: string }
  /** Not in a state for this, such as a second accept. */
  | { status: "not_allowed" }
  /** The trip changed in what the change touches: a proposal is now refused; an undo can be tried again. */
  | { status: "conflict" }
  /** A turn runs: try again when it ends. */
  | { status: "busy" };
