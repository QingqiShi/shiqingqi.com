import { ApiError } from "@tuja/auth-ui/api-error";
import { fetchJson } from "@tuja/auth-ui/fetch-json";
import type { SupportedLocale } from "@tuja/i18n/types";
import type {
  AssistantState,
  CardAction,
  DecideOutcome,
  MemoryLists,
  MemoryScopeName,
  SegmentInfo,
  SegmentTranscript,
  StreamLine,
} from "./types.ts";

export type {
  AssistantState,
  AttachmentChip,
  CardAction,
  CardView,
  ChangeStatus,
  CreatedTrip,
  DayChoice,
  DecideOutcome,
  MemoryFile,
  MemoryLists,
  MemoryScopeName,
  RefusalReason,
  SegmentInfo,
  SegmentTranscript,
  SendFailure,
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
    input: {
      /** Null on New trip: the message goes to the person's conversation that starts a trip. */
      tripId: string | null;
      text: string;
      /** Up to 4 images, PDFs or pasted texts (`text/plain`), within the limits of `attachments.ts`. */
      files?: readonly { name: string; blob: Blob }[];
      /** The language of the screen: the server names a long text that it makes an attachment in it. */
      locale?: SupportedLocale;
    },
    signal?: AbortSignal,
  ): AsyncGenerator<StreamLine> {
    const files = input.files ?? [];
    if (files.length === 0) {
      const response = await fetchJson(
        "/api/assistant/send",
        {
          method: "POST",
          body: JSON.stringify({
            tripId: input.tripId,
            text: input.text,
            locale: input.locale,
          }),
          signal,
        },
        "request_failed",
      );
      yield* lines(response);
      return;
    }
    const form = new FormData();
    if (input.tripId !== null) form.set("tripId", input.tripId);
    form.set("text", input.text);
    if (input.locale) form.set("locale", input.locale);
    for (const file of files) form.append("file", file.blob, file.name);
    const response = await fetch("/api/assistant/send", {
      method: "POST",
      body: form,
      signal,
      credentials: "same-origin",
    });
    if (!response.ok) {
      const data: unknown = await response.json().catch(() => null);
      const code =
        typeof data === "object" &&
        data !== null &&
        "error" in data &&
        typeof data.error === "string"
          ? data.error
          : "request_failed";
      throw new ApiError(code, response.status, data, null);
    }
    yield* lines(response);
  },

  /**
   * The person's open segment with its transcript, whether a turn runs, and
   * the trip's version. It makes nothing. Poll it while `running` is true
   * and no stream is read. With a null trip: the person's conversation that
   * starts a trip, when it moved in the last 4 hours.
   */
  state(tripId: string | null, signal?: AbortSignal): Promise<AssistantState> {
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
  conversation(
    conversationId: string,
    signal?: AbortSignal,
  ): Promise<SegmentTranscript> {
    return post(
      "/api/assistant/conversations/read",
      { conversationId },
      signal,
    );
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

  /**
   * Taps a button on a research card: "add" puts the place in the day,
   * "backup" saves it there as an option. The server builds the change from
   * the card that it stored, saves it with Undo, and does each action of a
   * card once. After `done`, read the trip again, then `state`.
   */
  cardAction(input: {
    changeId: string;
    itemId: string;
    action: CardAction;
    dayId: string;
  }): Promise<DecideOutcome> {
    return post("/api/assistant/card", input);
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
