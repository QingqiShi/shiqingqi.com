import { fetchJson } from "@tuja/auth-ui/fetch-json";
import type {
  AssistantState,
  DecideOutcome,
  MemoryLists,
  MemoryScopeName,
  SegmentInfo,
  SegmentTranscript,
  StreamLine,
} from "./types.ts";

export type {
  AssistantState,
  ChangeStatus,
  DecideOutcome,
  MemoryFile,
  MemoryLists,
  MemoryScopeName,
  RefusalReason,
  SegmentInfo,
  SegmentTranscript,
  StreamLine,
  TranscriptItem,
  TurnEvent,
} from "./types.ts";

/** The longest message that the assistant takes. */
export const MAX_MESSAGE_CHARS = 20_000;
/** The longest memory file. */
export const MAX_MEMORY_FILE_CHARS = 4000;

async function post<T>(path: string, body: unknown, signal?: AbortSignal) {
  const response = await fetchJson(
    path,
    { method: "POST", body: JSON.stringify(body), signal },
    "request_failed",
  );
  return (await response.json()) as T;
}

async function* lines(response: Response): AsyncGenerator<StreamLine> {
  if (!response.body) return;
  const reader = response.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffered = "";
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buffered += value;
    let end = buffered.indexOf("\n");
    while (end !== -1) {
      const line = buffered.slice(0, end).trim();
      buffered = buffered.slice(end + 1);
      if (line !== "") yield JSON.parse(line) as StreamLine;
      end = buffered.indexOf("\n");
    }
  }
}

/**
 * The trip assistant, from the browser, as the signed-in member. Each call
 * throws `ApiError` on a refusal: 401 with no session, 404 for a trip,
 * conversation, change or memory that is not the person's to use, 409
 * `busy` while a turn of the person runs in the trip, and 400
 * `invalid_body`.
 */
export const assistantApi = {
  /**
   * Sends the person's message, and yields what happens in the turn: first
   * `started` with the segment that it went to (a new one after 4 hours of
   * quiet), then the turn's events, `done` last. The turn runs on the
   * server whatever happens here: when the stream breaks or the page goes
   * away, it has not failed; poll `state` until `running` is false. An
   * abort only stops the reading, and makes the generator throw. 400
   * `invalid_body` for an empty text or one over `MAX_MESSAGE_CHARS`.
   */
  async *send(
    input: { tripId: string; text: string },
    signal?: AbortSignal,
  ): AsyncGenerator<StreamLine> {
    const response = await fetchJson(
      "/api/assistant/send",
      { method: "POST", body: JSON.stringify(input), signal },
      "request_failed",
    );
    yield* lines(response);
  },

  /**
   * The person's open segment with its transcript, whether a turn runs, and
   * the trip's version. It makes nothing. Poll it while `running` is true
   * and no stream is read.
   */
  state(tripId: string, signal?: AbortSignal): Promise<AssistantState> {
    return post("/api/assistant/state", { tripId }, signal);
  },

  /**
   * The trip's version, for any member: when it is not `digest(trip)` of
   * the trip on screen, read the trip again.
   */
  version(tripId: string, signal?: AbortSignal): Promise<{ version: string }> {
    return post("/api/assistant/version", { tripId }, signal);
  },

  /** Ends the open segment, with its summary, and opens a clean one. An open segment with no message stays. */
  startNew(tripId: string): Promise<AssistantState> {
    return post("/api/assistant/new", { tripId });
  },

  /** The person's earlier segments in the trip with their summaries, the newest first, with the open one. */
  conversations(tripId: string): Promise<{ segments: SegmentInfo[] }> {
    return post("/api/assistant/conversations", { tripId });
  },

  /** One segment of the person, with its transcript. */
  conversation(conversationId: string): Promise<SegmentTranscript> {
    return post("/api/assistant/conversations/read", { conversationId });
  },

  /** Goes on with an earlier segment: it becomes the open one, and the one open before ends with its summary. */
  reopen(conversationId: string): Promise<AssistantState> {
    return post("/api/assistant/conversations/reopen", { conversationId });
  },

  /**
   * Accepts or skips a proposal, or undoes a change. The server applies only
   * the ops that it stored. After `done` with a `version`, read the trip
   * again; then read `state` for the card's new status.
   */
  decide(
    changeId: string,
    decision: "accept" | "skip" | "undo",
  ): Promise<DecideOutcome> {
    return post("/api/assistant/decide", { changeId, decision });
  },

  /** The trip's memory and the person's own, for the memory panel. */
  memory(tripId: string): Promise<MemoryLists> {
    return post("/api/assistant/memory", { tripId });
  },

  /**
   * Writes a memory file in place of any at its path. 422 `invalid` for a
   * path that is not like `preferences.md`, `full` for a scope of 100 files.
   */
  writeMemory(input: {
    tripId: string;
    scope: MemoryScopeName;
    path: string;
    content: string;
  }): Promise<{ ok: true }> {
    return post("/api/assistant/memory/write", input);
  },

  deleteMemory(input: {
    tripId: string;
    scope: MemoryScopeName;
    path: string;
  }): Promise<{ ok: true }> {
    return post("/api/assistant/memory/delete", input);
  },
};
