import {
  generateText,
  isStepCount,
  type LanguageModelUsage,
  type ModelMessage,
  type StepResult,
  type ToolSet,
} from "ai";
import { and, eq } from "drizzle-orm";
import type { AssistantModel } from "#src/assistant/ai/types.ts";
import {
  agentActions,
  agentRuns,
  type AgentRunStatus,
  type AgentTask,
} from "#src/assistant/db/schema.ts";
import type { AssistantDb } from "#src/assistant/db/types.ts";
import { TOOL_SEARCH, toAiTools, type AgentTools } from "./agent-tool.ts";
import type { AgentStepRecord, AgentUsage, ModelTokens } from "./types.ts";

/** How long a model call that started before `endsAt` may go on after it. */
const OVERRUN_MS = 45_000;
const MAX_OUTPUT_TOKENS = 8000;
const MAX_TEXT_CHARS = 4000;
const MAX_VALUE_CHARS = 1500;
const MAX_ERROR_CHARS = 300;

export type NewAgentAction = Omit<
  typeof agentActions.$inferInsert,
  "id" | "runId" | "userId" | "createdAt" | "undoneAt"
>;

/** What the tools of a run can do with the run. */
export interface AgentRunContext {
  logAction: (action: NewAgentAction) => Promise<void>;
  /** For the tokens of a sub-agent call. */
  addUsage: (modelId: string, usage: LanguageModelUsage) => void;
}

/** One kind of job for the agent. */
export interface AgentTaskSpec {
  task: AgentTask;
  instructions: string;
  prompt: string;
  maxSteps: number;
  tools: (context: AgentRunContext) => AgentTools;
}

export interface AgentRunResult {
  runId: string;
  status: AgentRunStatus;
  steps: number;
  text: string | null;
}

function cut(text: string, limit: number) {
  return text.length > limit ? `${text.slice(0, limit - 1)}…` : text;
}

function json(value: unknown) {
  try {
    return cut(JSON.stringify(value), MAX_VALUE_CHARS);
  } catch {
    return "(not JSON)";
  }
}

function recordStep(step: StepResult<ToolSet>): AgentStepRecord {
  const calls: AgentStepRecord["calls"] = [];
  const results: AgentStepRecord["results"] = [];
  for (const part of step.content) {
    if (part.type === "tool-call") {
      calls.push({
        id: part.toolCallId,
        tool: part.toolName,
        input: json(part.input),
      });
    } else if (part.type === "tool-result") {
      results.push({
        id: part.toolCallId,
        tool: part.toolName,
        output: json(part.output),
      });
    } else if (part.type === "tool-error") {
      results.push({
        id: part.toolCallId,
        tool: part.toolName,
        output: json({ error: String(part.error) }),
      });
    }
  }
  return {
    text: step.text ? cut(step.text, MAX_TEXT_CHARS) : null,
    calls,
    results,
    finishReason: step.finishReason,
  };
}

function addTokens(
  usage: AgentUsage,
  modelId: string,
  add: LanguageModelUsage,
) {
  const tokens: ModelTokens = usage[modelId] ?? {
    inputTokens: 0,
    outputTokens: 0,
    cacheReadTokens: 0,
    cacheWriteTokens: 0,
  };
  usage[modelId] = {
    inputTokens: tokens.inputTokens + (add.inputTokens ?? 0),
    outputTokens: tokens.outputTokens + (add.outputTokens ?? 0),
    cacheReadTokens:
      tokens.cacheReadTokens + (add.inputTokenDetails.cacheReadTokens ?? 0),
    cacheWriteTokens:
      tokens.cacheWriteTokens + (add.inputTokenDetails.cacheWriteTokens ?? 0),
  };
}

/**
 * The messages of the next step, with an Anthropic cache breakpoint on the
 * last one only, so that each step reads the steps before it from the cache.
 */
function withCacheBreakpoint(messages: ModelMessage[]): ModelMessage[] {
  const last = messages.at(-1);
  if (!last) return messages;
  return [
    ...messages.slice(0, -1),
    {
      ...last,
      providerOptions: {
        ...last.providerOptions,
        anthropic: { cacheControl: { type: "ephemeral" } },
      },
    },
  ];
}

/**
 * The task's instructions, with the names of the tools that load only
 * through the tool search: the model does not know of them otherwise.
 */
function instructionsFor(spec: AgentTaskSpec, tools: AgentTools) {
  const deferred = Object.entries(tools)
    .filter(([, tool]) => !tool.loadUpFront)
    .map(([name]) => name);
  if (deferred.length === 0) return spec.instructions;
  return `${spec.instructions}

${TOOL_SEARCH} loads these tools when you need them: ${deferred.join(", ")}.`;
}

function isAbort(error: unknown) {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

/**
 * Runs one agent for one user: the model calls the task's tools until it
 * stops, reaches `maxSteps`, or the time reaches `endsAt`. The run, its
 * steps and its tokens go to `agent_runs`; the tools write what they
 * change to `agent_actions`. A failed model call ends the run as `failed`
 * and does not throw: what the tools did before it stays done and logged.
 */
export async function runAgent(
  {
    db,
    userId,
    model,
    endsAt,
    now,
  }: {
    db: AssistantDb;
    userId: string;
    model: AssistantModel;
    endsAt: number;
    now: () => Date;
  },
  spec: AgentTaskSpec,
): Promise<AgentRunResult> {
  const [run] = await db
    .insert(agentRuns)
    .values({ userId, task: spec.task, modelId: model.id, startedAt: now() })
    .returning({ id: agentRuns.id });
  const usage: AgentUsage = {};
  const transcript: AgentStepRecord[] = [];
  const context: AgentRunContext = {
    logAction: async (action) => {
      await db
        .insert(agentActions)
        .values({ ...action, runId: run.id, userId });
    },
    addUsage: (modelId, added) => {
      addTokens(usage, modelId, added);
    },
  };

  let status: AgentRunStatus;
  let text: string | null = null;
  let errorMessage: string | null = null;
  try {
    const left = endsAt - now().getTime();
    const tools = spec.tools(context);
    const result = await generateText({
      model: model.model,
      instructions: instructionsFor(spec, tools),
      messages: [{ role: "user", content: spec.prompt }],
      tools: toAiTools(tools),
      stopWhen: [isStepCount(spec.maxSteps), () => now().getTime() >= endsAt],
      reasoning: "low",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      abortSignal: Number.isFinite(left)
        ? AbortSignal.timeout(Math.max(0, left) + OVERRUN_MS)
        : undefined,
      prepareStep: ({ initialMessages, responseMessages }) => ({
        messages: withCacheBreakpoint([
          ...initialMessages,
          ...responseMessages,
        ]),
      }),
      onStepEnd: (step) => {
        transcript.push(recordStep(step));
        addTokens(usage, model.id, step.usage);
      },
    });
    text = result.text.trim() ? cut(result.text.trim(), MAX_TEXT_CHARS) : null;
    status = result.finishReason === "tool-calls" ? "stopped" : "done";
  } catch (error) {
    status = isAbort(error) ? "stopped" : "failed";
    errorMessage = cut(
      error instanceof Error ? error.message : String(error),
      MAX_ERROR_CHARS,
    );
    console.error("Agent run ended early", spec.task, errorMessage);
  }
  await db
    .update(agentRuns)
    .set({
      status,
      endedAt: now(),
      finalText: text,
      transcript,
      usage,
      errorMessage,
    })
    .where(and(eq(agentRuns.id, run.id), eq(agentRuns.userId, userId)));
  return { runId: run.id, status, steps: transcript.length, text };
}
