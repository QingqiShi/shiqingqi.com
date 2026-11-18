import {
  forwardAnthropicContainerIdFromLastStep,
  type AnthropicLanguageModelOptions,
} from "@ai-sdk/anthropic";
import type { SupportedLocale } from "@tuja/i18n/types";
import { getAnthropicProvider } from "@tuja/server-clients/get-anthropic-provider";
import {
  hasToolCall,
  isStepCount,
  streamText,
  tool,
  type LanguageModel,
  type ModelMessage,
  type SystemModelMessage,
  type ToolSet,
} from "ai";
import "server-only";
import { addStepUse } from "#src/ai/add-step-use.ts";
import { emptyUse, type ModelUse } from "#src/ai/empty-use.ts";
import { logAiRun } from "#src/ai/log-ai-run.ts";
import {
  checkAttachments,
  LONG_PASTE_CHARS,
  PASTED_TEXT_NAMES,
  uniqueNames,
  type AttachmentRefusal,
  type StoredAttachments,
} from "#src/assistant/check-attachments.ts";
import { describeError } from "#src/assistant/describe-error.ts";
import {
  getTripSkills,
  type TripSkill,
} from "#src/assistant/skills/get-trip-skills.ts";
import { turnSkills } from "#src/assistant/skills/turn-skills.ts";
import { conversations } from "#src/assistant/store/conversations.ts";
import { messages } from "#src/assistant/store/messages.ts";
import type { TripsDb } from "#src/db/types.ts";
import { asViewer } from "#src/trips/as-viewer.ts";
import { callAgentTool, type AgentTool } from "./agent-tool.ts";
import {
  assistantPrompt,
  ATTACHMENT,
  MEMBER_LINK,
} from "./assistant-prompt.ts";
import { codeWork } from "./code-work.ts";
import { contextManagement } from "./context-management.ts";
import { memoryTool } from "./memory-tool.ts";
import {
  READER_MODEL_ID,
  readerAgent,
  type Reader,
  type ReaderFile,
} from "./reader/reader-agent.ts";
import { researchAgent, type Researcher } from "./research/research-agent.ts";
import { memberLinks } from "./research/research-brief.ts";
import { researchTools } from "./research/research-tools.ts";
import { segmentMessages } from "./segment-messages.ts";
import { tripTools } from "./trip-tools.ts";
import { tripView } from "./trip-view.ts";
import { TurnEvents, type TurnEvent, type TurnStatus } from "./turn-events.ts";
import { TurnTrust, type TurnContext } from "./turn-trust.ts";

export const ASSISTANT_MODEL_ID = "claude-sonnet-5-5";

/** The longest message that a turn takes. */
export const MAX_MESSAGE_CHARS = 20_000;
/** How long the reader may take, so that the turn keeps time to answer. */
const READER_MS = 60_000;

/** How long a turn holds the lock. The model stops before, so that the lock frees itself only after a crash. */
const TURN_LOCK_SECONDS = 330;
const TURN_DEADLINE_MS = 280_000;
const MAX_STEPS = 16;
const MAX_OUTPUT_TOKENS = 8000;
const EARLIER_SUMMARIES = 3;
/** The segments to look through for those summaries: a short one can have none. */
const RECENT_SEGMENTS = 20;

const INSTRUCTIONS: SystemModelMessage = {
  role: "system",
  content: assistantPrompt.instructions,
  // The tools come before the system prompt, so this one breakpoint keeps
  // both for an hour: people often take minutes to answer.
  providerOptions: {
    anthropic: { cacheControl: { type: "ephemeral", ttl: "1h" } },
  },
};

/** The messages of a step, with a cache breakpoint on the last, so that each step reads the ones before from the cache. */
function withCacheBreakpoint(history: ModelMessage[]): ModelMessage[] {
  const last = history.at(-1);
  if (!last) return history;
  return [
    ...history.slice(0, -1),
    {
      ...last,
      providerOptions: {
        ...last.providerOptions,
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
  ];
}

/** The same tools in the same order for every turn, so that the cached prefix stays the same. */
function aiTools(context: TurnContext): ToolSet {
  const wrap = (name: string, agentTool: AgentTool) =>
    tool({
      description: agentTool.description,
      inputSchema: agentTool.inputSchema,
      execute: async (input: unknown, { toolCallId }) => {
        context.emit({ type: "tool", toolCallId, tool: name, state: "start" });
        try {
          return await callAgentTool(agentTool, input, { toolCallId });
        } finally {
          context.emit({ type: "tool", toolCallId, tool: name, state: "end" });
        }
      },
    });
  return {
    ...Object.fromEntries(
      Object.entries({
        ...tripTools(context),
        ...researchTools(context),
      }).map(([name, each]) => [name, wrap(name, each)]),
    ),
    memory: memoryTool(context),
    [codeWork.toolName]: getAnthropicProvider().tools.codeExecution_20260120(),
  };
}

export interface TurnRequest {
  db: TripsDb;
  /** The asker, a member who can change the trip. */
  userId: string;
  /** How the model names the asker, such as a name or an email address. */
  askerName: string;
  conversationId: string;
  text: string;
  /** For a test or a script; else the time of the call. */
  now?: Date;
  /** For a test or a script; else `claude-sonnet-5-5`. */
  model?: LanguageModel;
  /** For a test or a script; else 280 s, under the lock's time. */
  deadlineMs?: number;
  /** For a test or a script; else the web research sub-agent on `claude-haiku-5-5`. */
  researcher?: Researcher;
  /**
   * The files of the message, with the kind that the server found from
   * their bytes. Only the reader sees them; the turn only proposes, and
   * writes no memory.
   */
  attachments?: readonly ReaderFile[];
  /** For a test or a script; else the reader sub-agent on `claude-haiku-5-5`. */
  reader?: Reader;
  /** For a test or a script; else the trip skills of the Anthropic account. */
  skills?: () => Promise<readonly TripSkill[]>;
  /** The person's language, which names a long text that becomes an attachment. */
  locale?: SupportedLocale;
}

export type TurnStart =
  | {
      status: "started";
      turnId: string;
      /** What happens in the turn, from its start, for each watcher. */
      events: AsyncIterable<TurnEvent>;
      /**
       * Settles when the turn is stored and its lock is free; it never
       * rejects. Keep the server alive until then, such as with `after`.
       */
      finished: Promise<TurnStatus>;
    }
  /** No open segment of the asker with this id, in a trip that the asker can change. */
  | { status: "not_found" }
  /** Another turn of the asker in this trip runs. */
  | { status: "busy" }
  /** The text is longer than `MAX_MESSAGE_CHARS`, or the message has neither text nor a file. */
  | { status: "too_long" }
  /** The files are more or larger than the limits. */
  | { status: AttachmentRefusal }
  /** The message could not be stored. The lock is free again, and the log has the error without its message. */
  | { status: "failed" };

/**
 * Runs one turn of the assistant: the asker's message, then the model's
 * answer with its tool calls. It gives a handle once the turn has started;
 * the turn then runs on the server until it ends, also when nobody watches
 * it, and stores each step as it ends. A failed turn keeps what it stored,
 * and frees the lock.
 */
export async function runTurn(request: TurnRequest): Promise<TurnStart> {
  const { db, userId, conversationId } = request;
  let text = request.text.trim();
  if (text.length > MAX_MESSAGE_CHARS) return { status: "too_long" };
  const sent = [...(request.attachments ?? [])];
  if (text.length > LONG_PASTE_CHARS) {
    sent.push({
      name: PASTED_TEXT_NAMES[request.locale ?? "en"],
      kind: "text",
      mediaType: "text/plain",
      data: new TextEncoder().encode(text),
    });
    text = "";
  }
  if (text.length === 0 && sent.length === 0) return { status: "too_long" };
  const decoder = new TextDecoder();
  const refusal = checkAttachments(
    sent.map((file) => ({
      kind: file.kind,
      size: file.data.byteLength,
      chars: file.kind === "text" ? decoder.decode(file.data).length : 0,
    })),
  );
  if (refusal) return { status: refusal };
  const names = uniqueNames(sent.map((file) => file.name));
  const files = sent.map((file, index) => ({ ...file, name: names[index] }));
  const now = request.now ?? new Date();

  const taken = await asViewer(db, userId, async (tx) => {
    const conversation = await conversations.get(tx, conversationId);
    if (!conversation || conversation.endedAt) return null;
    const turnId = await conversations.takeTurn(
      tx,
      conversationId,
      TURN_LOCK_SECONDS,
    );
    return turnId ? { turnId, tripId: conversation.tripId } : "busy";
  });
  if (taken === null) return { status: "not_found" };
  if (taken === "busy") return { status: "busy" };
  const { turnId, tripId } = taken;

  const trust = new TurnTrust();
  if (files.length > 0) trust.taint(ATTACHMENT);
  // The model can call research and apply_changes in one step, and then the
  // change runs before the page text comes in. A link can bring page text,
  // so it taints the turn at the start.
  if (memberLinks(text).length > 0) trust.taint(MEMBER_LINK);
  const events = new TurnEvents();
  const deadline = AbortSignal.timeout(
    Math.max(
      1,
      Math.round(
        Math.min(request.deadlineMs ?? TURN_DEADLINE_MS, TURN_DEADLINE_MS),
      ),
    ),
  );
  const attachmentNames = new Set(names);
  const context: TurnContext = {
    db,
    userId,
    tripId,
    conversationId,
    trust,
    emit: (event) => {
      events.push(event);
    },
    memberText: text,
    researcher: request.researcher ?? researchAgent(),
    attachmentNames,
    signal: deadline,
  };

  let history: ModelMessage[];
  try {
    const stored =
      files.length > 0
        ? await readFiles({
            db,
            userId,
            tripId,
            files,
            reader: request.reader ?? readerAgent(),
            events,
            signal: AbortSignal.any([deadline, AbortSignal.timeout(READER_MS)]),
          })
        : undefined;
    history = await asViewer(db, userId, async (tx) => {
      const trip = tripId === null ? null : await tripView.read(tx, tripId);
      if (tripId !== null && !trip) {
        throw new Error("The trip of the conversation is gone.");
      }
      const segment = await segmentMessages.read(tx, conversationId);
      for (const entry of segment) {
        if (entry.kind !== "model") continue;
        for (const file of entry.attachments?.files ?? []) {
          attachmentNames.add(file.name);
        }
      }
      const tapped = segmentMessages.isOptionTap(segment, text);
      if (
        tapped &&
        (await segmentMessages.holdsUntrusted(tx, conversationId, segment))
      ) {
        trust.holdMemory();
      }
      const ownWords = memberLinks(text).reduce(
        (rest, link) => rest.replaceAll(link, ""),
        text,
      );
      const appLanguage =
        tapped || !/\p{L}/u.test(ownWords) ? (request.locale ?? null) : null;
      const isFirst = !segment.some((entry) => entry.kind === "model");
      const earlier =
        isFirst && tripId !== null
          ? (await conversations.list(tx, tripId, RECENT_SEGMENTS))
              .flatMap(({ id, startedAt, summary }) =>
                id !== conversationId && summary !== null
                  ? [{ startedAt, summary }]
                  : [],
              )
              .slice(0, EARLIER_SUMMARIES)
          : [];
      const userMessage: ModelMessage = {
        role: "user",
        content: [
          {
            type: "text",
            text: assistantPrompt.userMessage(text, {
              askerName: request.askerName,
              trip,
              version: trip && tripView.version(trip),
              now,
              untrusted: trust.reason,
              earlierSummaries: earlier,
              appLanguage,
            }),
          },
          ...(stored
            ? [
                {
                  type: "text" as const,
                  text: assistantPrompt.attachmentBlock(stored),
                },
              ]
            : []),
        ],
      };
      const added = await messages.append(tx, conversationId, turnId, [
        segmentMessages.modelEntry(userMessage, stored),
      ]);
      if (added === null) throw new Error("The turn lost its lock.");
      return [...segmentMessages.forModel(segment), userMessage];
    });
  } catch (error) {
    console.error("The assistant turn could not start:", describeError(error));
    await release(db, userId, conversationId, turnId);
    return { status: "failed" };
  }

  const finished = drive({ request, context, turnId, events, history });
  return { status: "started", turnId, events, finished };
}

/**
 * Gives the files to the reader, once, and keeps what it found: the names,
 * kinds and sizes of the files and the items, never the files themselves.
 * A failure keeps no items, and the turn goes on without them.
 */
async function readFiles({
  db,
  userId,
  tripId,
  files,
  reader,
  events,
  signal,
}: {
  db: TripsDb;
  userId: string;
  tripId: string | null;
  files: readonly ReaderFile[];
  reader: Reader;
  events: TurnEvents;
  signal: AbortSignal;
}): Promise<StoredAttachments> {
  const started = performance.now();
  const outcome = await reader(files, signal);
  try {
    await logAiRun(db, userId, {
      tripId,
      kind: "reader",
      model: READER_MODEL_ID,
      status:
        outcome.status === "ok"
          ? "ok"
          : outcome.timedOut
            ? "timeout"
            : "failed",
      use: outcome.use,
      durationMs: performance.now() - started,
    });
  } catch (error) {
    console.error("The AI run log failed:", describeError(error));
  }
  const stored: StoredAttachments = {
    status: outcome.status === "ok" ? "read" : "failed",
    files: files.map(({ name, kind, data }) => ({
      name,
      kind,
      size: data.byteLength,
    })),
    items: outcome.status === "ok" ? outcome.items : [],
  };
  events.push({
    type: "attachments",
    status: stored.status,
    items: stored.items.length,
  });
  return stored;
}

async function release(
  db: TripsDb,
  userId: string,
  conversationId: string,
  turnId: string,
) {
  try {
    await asViewer(db, userId, (tx) =>
      conversations.releaseTurn(tx, conversationId, turnId),
    );
  } catch (error) {
    console.error("The assistant turn kept its lock:", describeError(error));
  }
}

async function drive({
  request,
  context,
  turnId,
  events,
  history,
}: {
  request: TurnRequest;
  context: TurnContext;
  turnId: string;
  events: TurnEvents;
  history: ModelMessage[];
}): Promise<TurnStatus> {
  const { db, userId, conversationId } = request;
  const started = performance.now();
  const use: ModelUse = emptyUse();
  let stored = 0;
  let saving = Promise.resolve();

  /** Adds the response messages after the stored ones, in order. */
  const store = (responseMessages: readonly ModelMessage[]) => {
    const fresh = responseMessages.slice(stored);
    stored = responseMessages.length;
    if (fresh.length === 0) return saving;
    saving = saving.then(async () => {
      const added = await asViewer(db, userId, (tx) =>
        messages.append(
          tx,
          conversationId,
          turnId,
          fresh.map((message) => segmentMessages.modelEntry(message)),
        ),
      );
      if (added === null) throw new Error("The turn lost its lock.");
    });
    return saving;
  };

  const deadline = context.signal;
  let status: TurnStatus;
  try {
    const tools = aiTools(context);
    const skills = await turnSkills.load(request.skills ?? getTripSkills);
    const result = streamText({
      model: request.model ?? getAnthropicProvider().chat(ASSISTANT_MODEL_ID),
      instructions: INSTRUCTIONS,
      messages: history,
      tools,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: deadline,
      stopWhen: [
        isStepCount(MAX_STEPS),
        hasToolCall("ask_person"),
        // A step that the output limit cut can still end with a whole tool call, and then the loop goes on.
        ({ steps }) => steps.at(-1)?.finishReason === "length",
      ],
      onError: ({ error }) => {
        console.error("The model's stream failed:", describeError(error));
      },
      providerOptions: {
        anthropic: {
          contextManagement: contextManagement(Object.keys(tools)),
          effort: "medium",
          thinking: {
            type: "adaptive",
            blockBinding: { prefixMismatchBehavior: "drop_block" },
          },
          fallbacks: "default",
          ...turnSkills.containerOption(skills),
        } satisfies AnthropicLanguageModelOptions,
      },
      // Each step's messages are stored before the next step, so that a
      // turn that stops keeps the steps that it ended. A code run that came
      // with a call to one of our tools ends in the next step, so that step
      // must use the same container.
      prepareStep: async ({ steps, initialMessages, responseMessages }) => {
        await store(responseMessages);
        return {
          ...forwardAnthropicContainerIdFromLastStep({ steps }),
          messages: withCacheBreakpoint([
            ...initialMessages,
            ...responseMessages,
          ]),
        };
      },
      onStepEnd: (step) => {
        addStepUse(use, step);
      },
    });
    let streamError: unknown = null;
    const compactionIds = new Set<string>();
    for await (const part of result.stream) {
      if (part.type === "text-start") {
        const metadata = part.providerMetadata;
        if (
          metadata !== undefined &&
          "anthropic" in metadata &&
          metadata.anthropic.type === "compaction"
        ) {
          compactionIds.add(part.id);
        }
      } else if (part.type === "text-end") {
        compactionIds.delete(part.id);
      } else if (part.type === "text-delta") {
        if (!compactionIds.has(part.id)) {
          events.push({ type: "text", text: part.text });
        }
      } else if (part.type === "tool-call" && part.providerExecuted) {
        events.push({
          type: "tool",
          toolCallId: part.toolCallId,
          tool: part.toolName,
          state: "start",
        });
        if (part.toolName === codeWork.toolName) {
          events.push({ type: "worked", work: codeWork.of(part.input) });
        }
      } else if (part.type === "tool-result" && part.providerExecuted) {
        events.push({
          type: "tool",
          toolCallId: part.toolCallId,
          tool: part.toolName,
          state: "end",
        });
      } else if (part.type === "error") {
        streamError = part.error;
      }
    }
    if (streamError !== null) {
      throw streamError instanceof Error
        ? streamError
        : new Error("The model's stream failed.", { cause: streamError });
    }
    if (deadline.aborted) throw new Error("The turn ran out of time.");
    await store(await result.responseMessages);
    const finishReason = await result.finishReason;
    status =
      finishReason === "length"
        ? "cut_off"
        : finishReason === "content-filter" || finishReason === "error"
          ? "failed"
          : "ok";
  } catch (error) {
    status = deadline.aborted ? "timeout" : "failed";
    console.error("The assistant turn failed:", describeError(error));
  }
  try {
    await saving;
  } catch (error) {
    status = "failed";
    console.error(
      "The assistant turn was not stored whole:",
      describeError(error),
    );
  }
  await release(db, userId, conversationId, turnId);
  try {
    await logAiRun(db, userId, {
      tripId: context.tripId,
      kind: "assistant",
      model: ASSISTANT_MODEL_ID,
      status: status === "cut_off" ? "aborted" : status,
      use,
      durationMs: performance.now() - started,
    });
  } catch (error) {
    console.error("The AI run log failed:", describeError(error));
  }
  events.push({ type: "done", status });
  return status;
}
