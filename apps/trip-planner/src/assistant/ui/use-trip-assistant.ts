import { ApiError } from "@tuja/auth-ui/api-error";
import { useLocale } from "@tuja/i18n/use-locale";
import { useRouter } from "next/navigation";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import { codeWork } from "#src/assistant/agent/code-work.ts";
import {
  assistantApi,
  MAX_MESSAGE_CHARS,
  type AssistantState,
  type AttachmentChip,
  type CardAction,
  type SegmentTranscript,
  type StreamLine,
  type TranscriptItem,
} from "#src/assistant/assistant-api.ts";
import { PASTED_TEXT_NAMES } from "#src/assistant/check-attachments.ts";
import {
  draftAttachments,
  type AttachFailure,
  type DraftAttachment,
} from "./draft-attachments.ts";

const { draftOf, draftsFit, pastedDraft } = draftAttachments;

/** Why the last message did not get a full answer. */
export type SendFailure =
  "failed" | "timeout" | "too_long" | "busy" | "attachments" | "request_failed";

/** Why the last tap on a change card did not go through. */
export type DecideFailure = "conflict" | "busy" | "request_failed";

const POLL_MS = 1500;

/** Why "New conversation" or "Continue this conversation" did not go through. */
export type SegmentFailure = "busy" | "request_failed";

/** The turn that streams now: what the person sent, and what came back so far. */
interface LiveTurn {
  member: string;
  attachments: AttachmentChip[];
  items: TranscriptItem[];
  /** The segment that the turn went to, once the stream says it. */
  segment: { id: string; startedAt: string } | null;
  /** The web addresses of the research lists of this turn. */
  links: string[];
}

function withLine(turn: LiveTurn, line: StreamLine): LiveTurn {
  const items = [...turn.items];
  switch (line.type) {
    case "started":
      return {
        ...turn,
        segment: {
          id: line.conversationId,
          startedAt: new Date().toISOString(),
        },
      };
    case "text": {
      const last = items.at(-1);
      if (last?.type === "assistant") {
        items[items.length - 1] = { ...last, text: last.text + line.text };
      } else {
        items.push({
          type: "assistant",
          key: `live:text:${String(items.length)}`,
          text: line.text,
        });
      }
      return { ...turn, items };
    }
    // The item keeps the texts before and after the call apart. It draws
    // nothing: most calls end within a moment, so a line for each one only
    // flickers, and the prompt says "Answering…" for the whole turn.
    case "tool": {
      const key = `live:tool:${line.toolCallId}`;
      if (line.state === "end") {
        return {
          ...turn,
          items: items.map((item) =>
            item.key === key && item.type === "tool"
              ? { ...item, running: false }
              : item,
          ),
        };
      }
      items.push({ type: "tool", key, tool: line.tool, running: true });
      return { ...turn, items };
    }
    case "worked": {
      const at = items.findIndex((item) => item.type === "worked");
      const shown = items.at(at);
      if (at !== -1 && shown?.type === "worked") {
        items[at] = {
          ...shown,
          work: codeWork.stronger(shown.work, line.work),
        };
      } else {
        items.push({ type: "worked", key: "live:worked", work: line.work });
      }
      return { ...turn, items };
    }
    case "research":
      return { ...turn, links: [...turn.links, ...line.urls] };
    case "attachments":
      return {
        ...turn,
        attachments: turn.attachments.map((chip) => ({
          ...chip,
          state: line.status,
        })),
      };
    case "cards":
      items.push({
        type: "cards",
        key: `live:cards:${line.changeId}`,
        changeId: line.changeId,
        cards: line.cards.map((card) => ({ ...card, actions: {} })),
      });
      return { ...turn, items };
    case "change":
      items.push({
        type: "change",
        key: `live:change:${line.changeId}`,
        changeId: line.changeId,
        kind: line.kind,
        status: line.kind === "applied" ? "applied" : "pending",
        summary: line.summary,
        dayIds: line.dayIds,
        canUndo: line.kind === "applied",
        ...(line.fromFile !== undefined && { fromFile: line.fromFile }),
      });
      return { ...turn, items };
    case "question":
      items.push({
        type: "question",
        key: `live:question:${String(items.length)}`,
        question: line.question,
        options: line.options,
      });
      return { ...turn, items };
    case "remembered":
      items.push({
        type: "remembered",
        key: `live:remembered:${String(items.length)}`,
        scope: line.scope,
        path: line.path,
        action: line.action,
        ...(line.text !== undefined && { text: line.text }),
      });
      return { ...turn, items };
    case "trip": {
      const { type: _type, ...made } = line;
      items.push({ type: "trip", key: `live:trip:${made.tripId}`, ...made });
      return { ...turn, items };
    }
    case "done":
      return turn;
  }
}

/** A stored segment as the state of a conversation that started a new trip. */
function asState(segment: SegmentTranscript): AssistantState {
  return { ...segment, version: null, days: [] };
}

function codeOf(error: unknown): string {
  return error instanceof ApiError ? error.code : "request_failed";
}

/** The answer of a request, or null when it failed. */
async function settle<T>(request: Promise<T>): Promise<T | null> {
  try {
    return await request;
  } catch {
    return null;
  }
}

/** Reads a sent message's stream to its end, or to where it breaks. */
async function readTurn(
  lines: AsyncIterable<StreamLine>,
  onLine: (line: StreamLine) => void,
) {
  let started = false;
  let ended: Extract<StreamLine, { type: "done" }>["status"] | null = null;
  try {
    for await (const line of lines) {
      if (line.type === "started") started = true;
      if (line.type === "done") ended = line.status;
      onLine(line);
    }
    return { started, ended, error: null };
  } catch (error) {
    return { started, ended, error };
  }
}

/**
 * The person's conversation with the trip assistant in one trip, or with a
 * null trip on New trip, where the conversation makes the trip. It lives
 * above the sheet and the panel, so that a stream goes on, and the text in
 * the field stays, while they are closed.
 */
export function useTripAssistant(
  tripId: string | null,
  /** The version of the trip on the screen, as the server read it; null with no trip. */
  shownVersion: string | null,
) {
  const router = useRouter();
  const [state, setState] = useState<AssistantState | null>(null);
  const [live, setLive] = useState<LiveTurn | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [draft, setDraft] = useState("");
  const [attachments, setAttachments] = useState<DraftAttachment[]>([]);
  const attachmentsRef = useRef<DraftAttachment[]>([]);
  const putAttachments = (next: DraftAttachment[]) => {
    attachmentsRef.current = next;
    setAttachments(next);
  };
  const [attachFailure, setAttachFailure] = useState<AttachFailure | null>(
    null,
  );
  const [isPreparing, setIsPreparing] = useState(false);
  const locale = useLocale();
  const pastedName: string = PASTED_TEXT_NAMES[locale];
  const [sendFailure, setSendFailure] = useState<SendFailure | null>(null);
  const [decideFailure, setDecideFailure] = useState<DecideFailure | null>(
    null,
  );
  const [deciding, setDeciding] = useState<string | null>(null);
  const [segmentFailure, setSegmentFailure] = useState<SegmentFailure | null>(
    null,
  );
  /** "new", or the id of the segment that goes on, while that request runs. */
  const [switching, setSwitching] = useState<string | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const streamingRef = useRef(false);
  const unmountedRef = useRef(new AbortController());
  const shownVersionRef = useRef(shownVersion);
  const refreshedForRef = useRef<string | null>(null);

  useEffect(() => {
    shownVersionRef.current = shownVersion;
    refreshedForRef.current = null;
  }, [shownVersion]);

  /** Reads the page again for this version of the trip, once; null for a version that is not known. */
  const refreshFor = (version: string | null) => {
    if (
      version !== null &&
      (version === shownVersionRef.current ||
        version === refreshedForRef.current)
    ) {
      return;
    }
    refreshedForRef.current = version;
    router.refresh();
  };

  useEffect(() => {
    const controller = new AbortController();
    unmountedRef.current = controller;
    return () => {
      controller.abort();
    };
  }, []);

  // On New trip, the conversation in view, once known: when it makes the
  // trip, it moves into the trip, and only its id still finds it.
  const newTripConversationRef = useRef<string | null>(null);

  const readState = (signal: AbortSignal) => {
    const conversationId = newTripConversationRef.current;
    return tripId === null && conversationId !== null
      ? assistantApi.conversation(conversationId, signal).then(asState)
      : assistantApi.state(tripId, signal);
  };

  const fetchState = async () => {
    const signal = unmountedRef.current.signal;
    const next = await settle(readState(signal));
    if (next === null) {
      if (!signal.aborted) setLoadFailed(true);
      return null;
    }
    if (tripId === null) {
      if (newTripConversationRef.current === null) {
        newTripConversationRef.current = next.segment?.id ?? null;
      }
    } else {
      refreshFor(next.version);
    }
    setLoadFailed(false);
    return next;
  };

  const isStreamingNow = () => streamingRef.current;

  /** Reads the conversation again, unless a stream here shows it now. */
  const load = async () => {
    if (isStreamingNow()) return;
    const next = await fetchState();
    // A message can go out while the read waits.
    if (!next || isStreamingNow()) return;
    setState(next);
    setLive(null);
  };

  /** A stream here broke, and no read of the conversation came after it. */
  const isUnsettled = live !== null && !isStreaming;
  const isRunning = isStreaming || isUnsettled || (state?.running ?? false);

  // A turn that runs with no stream here, such as one sent before the page
  // loaded again, shows when it ends.
  const poll = useEffectEvent(() => {
    void load();
  });
  useEffect(() => {
    if (isStreaming || !(state?.running || isUnsettled)) return;
    const timer = setTimeout(poll, POLL_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [isStreaming, state, isUnsettled]);

  /** Adds drafts to the field when all of them fit together; else says why not. */
  const addDrafts = (drafts: readonly (DraftAttachment | AttachFailure)[]) => {
    const failed = drafts.find((each) => typeof each === "string");
    const ready = drafts.filter((each) => typeof each !== "string");
    const next = [...attachmentsRef.current, ...ready];
    const unfit = draftsFit(next);
    setAttachFailure(failed ?? unfit);
    if (!unfit) putAttachments(next);
  };

  /** Puts photos and files that the person picked or pasted in the field. */
  const addFiles = async (files: readonly File[]) => {
    if (files.length === 0) return;
    setIsPreparing(true);
    const drafts = await Promise.all(files.map(draftOf));
    setIsPreparing(false);
    addDrafts(drafts);
  };

  /** Puts a long pasted text in the field as a file, as its text would only go to the reader. */
  const addPastedText = (text: string) => {
    const used = new Set(attachmentsRef.current.map((each) => each.name));
    let name = pastedName;
    for (let n = 2; used.has(name); n += 1) name = `${pastedName} ${String(n)}`;
    addDrafts([pastedDraft(text, name)]);
  };

  const removeAttachment = (id: string) => {
    setAttachFailure(null);
    putAttachments(attachmentsRef.current.filter((each) => each.id !== id));
  };

  /** Sends a message; `files` are the attachments in the field, which go with it. */
  const send = async (text: string, files: readonly DraftAttachment[] = []) => {
    const message = text.trim();
    if ((message === "" && files.length === 0) || isRunning || switching) {
      return;
    }
    if (isPreparing) return;
    if (message.length > MAX_MESSAGE_CHARS) {
      setSendFailure("too_long");
      return;
    }
    setSendFailure(null);
    setDecideFailure(null);
    setAttachFailure(null);
    setDraft("");
    if (files.length > 0) putAttachments([]);
    streamingRef.current = true;
    setIsStreaming(true);
    setSegmentFailure(null);
    setLive({
      member: message,
      attachments: files.map(({ name, kind }) => ({
        name,
        kind,
        state: "reading",
      })),
      items: [],
      segment: null,
      links: [],
    });
    const signal = unmountedRef.current.signal;
    const { started, ended, error } = await readTurn(
      assistantApi.send(
        {
          tripId,
          text: message,
          files: files.map(({ name, blob }) => ({ name, blob })),
          locale,
        },
        signal,
      ),
      (line) => {
        if (line.type === "started" && tripId === null) {
          newTripConversationRef.current = line.conversationId;
        }
        // The list of trips beside the page then has the new trip.
        if (line.type === "trip") router.refresh();
        if (line.type === "change" && line.kind === "applied") {
          refreshFor(null);
        }
        setLive((turn) => turn && withLine(turn, line));
      },
    );
    if (signal.aborted) return;
    let failure: SendFailure | null = null;
    if (!started) {
      const code = codeOf(error);
      failure =
        code === "too_long" || code === "invalid_body"
          ? "too_long"
          : code === "busy"
            ? "busy"
            : code === "too_many_attachments" ||
                code === "attachment_too_large" ||
                code === "attachment_type"
              ? "attachments"
              : "request_failed";
    }
    // A stream that broke after the start has not failed: the turn goes on
    // on the server, and the state shows it.
    const next = started ? await fetchState() : null;
    streamingRef.current = false;
    setIsStreaming(false);
    if (next) setState(next);
    if (next || !started) setLive(null);
    if (ended === "failed" || ended === "timeout") failure = ended;
    if (failure) {
      setSendFailure(failure);
      setDraft((current) => (current === "" ? message : current));
      if (files.length > 0 && attachmentsRef.current.length === 0) {
        putAttachments([...files]);
      }
    }
  };

  const decide = async (
    changeId: string,
    decision: "accept" | "skip" | "undo",
  ) => {
    if (isRunning || deciding) return;
    setDeciding(changeId);
    setDecideFailure(null);
    const outcome = await settle(assistantApi.decide(changeId, decision));
    if (outcome === null) {
      setDecideFailure("request_failed");
    } else if (outcome.status === "done" && outcome.version) {
      refreshFor(outcome.version);
    } else if (outcome.status === "busy") {
      setDecideFailure("busy");
    } else if (outcome.status === "conflict" && decision === "undo") {
      // A refused proposal says why on its card; an undo stays to try again.
      setDecideFailure("conflict");
    }
    await load();
    setDeciding(null);
  };

  /** Taps a button on a research card; `deciding` holds `changeId:itemId` while it runs. */
  const cardAction = async (
    changeId: string,
    itemId: string,
    action: CardAction,
    dayId: string,
  ) => {
    if (isRunning || deciding) return;
    setDeciding(`${changeId}:${itemId}`);
    setDecideFailure(null);
    const outcome = await settle(
      assistantApi.cardAction({ changeId, itemId, action, dayId }),
    );
    if (outcome === null) {
      setDecideFailure("request_failed");
    } else if (outcome.status === "done" && outcome.version) {
      refreshFor(outcome.version);
    } else if (outcome.status === "busy" || outcome.status === "conflict") {
      setDecideFailure(outcome.status);
    }
    await load();
    setDeciding(null);
  };

  /** Moves to another segment, and says whether it did. */
  const switchTo = async (
    target: string,
    request: () => Promise<AssistantState>,
  ) => {
    if (isRunning || switching) return false;
    setSwitching(target);
    setSegmentFailure(null);
    setSendFailure(null);
    setDecideFailure(null);
    const next = await request().catch((error: unknown) => {
      setSegmentFailure(codeOf(error) === "busy" ? "busy" : "request_failed");
      return null;
    });
    setSwitching(null);
    if (!next || unmountedRef.current.signal.aborted) return false;
    refreshFor(next.version);
    setState(next);
    setLive(null);
    return true;
  };

  /** Ends the open segment, with its summary, and opens a clean one. */
  const startNew = () =>
    tripId === null
      ? Promise.resolve(false)
      : switchTo("new", () => assistantApi.startNew(tripId));

  /** Goes on with an earlier segment, which becomes the one in view. */
  const reopen = (conversationId: string) =>
    switchTo(conversationId, () => assistantApi.reopen(conversationId));

  // A message after 4 quiet hours goes to a new segment: the one in view
  // then gives way, before the state of the new one comes.
  const isNewSegment =
    live?.segment != null && live.segment.id !== state?.segment?.id;
  const segment = isNewSegment ? live.segment : (state?.segment ?? null);

  const transcript: TranscriptItem[] = [
    ...(isNewSegment ? [] : (state?.transcript ?? [])),
    ...(live
      ? [
          {
            type: "member" as const,
            key: "live:member",
            text: live.member,
            ...(live.attachments.length > 0 && {
              attachments: live.attachments,
            }),
          },
          ...live.items,
        ]
      : []),
  ];

  return {
    isLoaded: state !== null,
    loadFailed,
    transcript,
    /** When the segment in view started; null before it has one. */
    startedAt: segment?.startedAt ?? null,
    isRunning,
    isStreaming,
    draft,
    setDraft,
    /** The files in the field, which go with the next message. */
    attachments,
    attachFailure,
    /** An image is being scaled down for the field. */
    isPreparing,
    /** The reader works on the files of the message that streams now. */
    isReading:
      live?.attachments.some((chip) => chip.state === "reading") ?? false,
    addFiles,
    addPastedText,
    removeAttachment,
    sendFailure,
    decideFailure,
    segmentFailure,
    deciding,
    /** "new", or the id of the segment that goes on, while that runs. */
    switching,
    /** Only these web addresses show as links in the assistant's text. */
    links: new Set([
      ...(isNewSegment ? [] : (state?.links ?? [])),
      ...(live?.links ?? []),
    ]),
    days: state?.days ?? [],
    /** The trip of the conversation; null on New trip, also after the conversation made one. */
    tripId,
    /** The trip that this conversation made, once it has. */
    createdTrip:
      transcript.findLast(
        (item): item is Extract<TranscriptItem, { type: "trip" }> =>
          item.type === "trip",
      ) ?? null,
    load,
    send,
    decide,
    cardAction,
    startNew,
    reopen,
    dismissSegmentFailure: () => {
      setSegmentFailure(null);
    },
  };
}

export type TripAssistantModel = ReturnType<typeof useTripAssistant>;
