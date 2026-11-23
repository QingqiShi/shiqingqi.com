import type { z } from "zod";
import type { FundDb } from "#src/db/types.ts";
import type { Effort, Role } from "../agents/model-for.ts";
import type { ReportLanguage } from "../agents/prompts.ts";
import type { StepUsage } from "../contracts/step-usage-schema.ts";
import type { RefreshSummary } from "../market/refresh-market-data.ts";
import type { Run, RunStep } from "../types.ts";

/** One call of one seat. `message` is the rendered input pack. */
export interface AgentRequest<T> {
  stepKey: string;
  role: Role;
  modelId: string;
  effort: Effort;
  instructions: string;
  message: string;
  schema: z.ZodType<T>;
  /** Null for a call with no web search. */
  webSearch: { maxUses: number } | null;
  timeoutMs: number;
  maxOutputTokens: number;
}

export interface AgentReply<T> {
  output: T;
  /** The model that answered. */
  model: string;
  usage: StepUsage;
}

/** Calls a model. It throws an `AgentCallError` when there is no valid answer. */
export type AgentCaller = <T>(
  request: AgentRequest<T>,
) => Promise<AgentReply<T>>;

/** Everything a meeting needs from the world outside the database. */
export interface MeetingDeps {
  db: FundDb;
  agent: AgentCaller;
  language: ReportLanguage;
  /** Brings market data up to date; null skips the refresh (replays, tests). */
  refreshMarket:
    ((symbols?: readonly string[]) => Promise<RefreshSummary>) | null;
  /** Limits the stocks that the screen and the analysts see, for cheap runs. */
  universe?: readonly string[] | null;
  /** Only for timestamps and the heartbeat, never for a market decision. */
  now: () => Date;
  /** Called when a step ends, for a CLI that prints the minutes. */
  onStepEnd?: (event: StepEndEvent) => void;
}

export interface StepEndEvent {
  key: string;
  status: "done" | "failed" | "skipped";
  model: string | null;
  usage: StepUsage | null;
  error: string | null;
  seconds: number;
}

/** What a step can see of its run. */
export interface StepContext {
  deps: MeetingDeps;
  run: Run;
  key: string;
  /** Epoch ms: a model call that cannot end before this does not start. */
  deadline: number;
  /** The output of a step that is done, checked by `schema`; or null. */
  output: <T>(key: string, schema: z.ZodType<T>) => T | null;
  /** The steps of the run as they were when this step started. */
  steps: readonly RunStep[];
}

/** What a step that ended well writes into its row. */
export interface StepOutcome {
  status: "done" | "skipped";
  input?: unknown;
  output?: unknown;
  memo?: string;
  model?: string;
  usage?: StepUsage;
}

/** One section of an input pack. The model reads the sections in this order. */
export interface PackSection {
  title: string;
  /** Text as it is, or a value that is sent as JSON. */
  body: unknown;
}
