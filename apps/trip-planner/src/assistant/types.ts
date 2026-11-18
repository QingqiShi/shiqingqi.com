import type { TurnEvent } from "./agent/turn-events.ts";
import type { ChangeStatus } from "./store/changes.ts";

export type { ChangeStatus, TurnEvent };

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
  /** What the person wrote, without the app's lines. */
  | { type: "member"; key: string; text: string }
  | { type: "assistant"; key: string; text: string }
  /** A compact line for one tool call, such as `read_trip` or `memory`, or a change that the server refused. */
  | { type: "tool"; key: string; tool: string }
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
    }
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
  /** The trip's version now, as `digest(trip)` gives it in the browser. */
  version: string;
}

export interface SegmentTranscript {
  segment: SegmentInfo;
  transcript: TranscriptItem[];
  running: boolean;
}

/** One line of the stream of a sent message. The first is `started`; the last is `done`. */
export type StreamLine =
  { type: "started"; conversationId: string; turnId: string } | TurnEvent;

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
