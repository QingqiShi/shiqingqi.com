import { runTransaction } from "@tuja/server-db/run-transaction";
import {
  and,
  asc,
  eq,
  gt,
  inArray,
  isNull,
  lt,
  notExists,
  or,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { runs, runSteps } from "../fund-schema.ts";
import { mapLimited } from "../market/map-limited.ts";
import type { Run, RunStep } from "../types.ts";
import { analystSteps } from "./analyst-steps.ts";
import { commitMeeting } from "./commit-meeting.ts";
import { commonSteps } from "./common-steps.ts";
import { dailySteps } from "./daily-steps.ts";
import { DeadlineReached, StepFailure } from "./step-failure.ts";
import { stepPlan, type PlannedStep } from "./step-plan.ts";
import { stepReads } from "./step-reads.ts";
import type { MeetingDeps, StepContext, StepOutcome } from "./types.ts";

const HEARTBEAT_MS = 20_000;
/** A worker beats every 20 s, so a heartbeat this old means it died. */
export const STALE_HEARTBEAT_MS = 90_000;

/** True while a worker advances the run: its heartbeat is not stale. */
export function isHeld(run: Pick<Run, "heartbeatAt">, now: Date): boolean {
  return (
    run.heartbeatAt !== null &&
    now.getTime() - run.heartbeatAt.getTime() < STALE_HEARTBEAT_MS
  );
}
const PARALLEL_CALLS = 4;
const ERROR_CHARS = 1000;

export type AdvanceOutcome =
  | "completed"
  | "failed"
  /** The deadline came; a later call continues. */
  | "paused"
  /** Another worker holds the run, or it is already completed. */
  | "busy";

type StepRunner = (ctx: StepContext) => Promise<StepOutcome>;

const RUNNERS = new Map<string, StepRunner>([
  ["data", commonSteps.data],
  ["screen", commonSteps.screen],
  ["macro", commonSteps.macro],
  ["pm_draft", dailySteps.pmDraft],
  ["checks_draft", dailySteps.checksDraft],
  ["risk_review", dailySteps.riskReview],
  ["pm_final", dailySteps.pmFinal],
  ["checks_final", dailySteps.checksFinal],
  ["risk_signoff", dailySteps.riskSignoff],
]);

function runnerFor(key: string): StepRunner {
  if (key.startsWith("analyst:")) return analystSteps.analyst;
  if (key.startsWith("followup:")) return analystSteps.followUp;
  const runner = RUNNERS.get(key);
  if (runner) return runner;
  throw new Error(`No step ${key} in a meeting.`);
}

function isSettled(step: RunStep): boolean {
  return (
    step.status === "done" ||
    step.status === "skipped" ||
    (step.status === "failed" && stepPlan.isSoft(step.key))
  );
}

/** The message of an error and of its cause; a failed query names its cause last. */
function messageOf(error: unknown): string {
  if (!(error instanceof Error)) return String(error).slice(0, ERROR_CHARS);
  const cause = error.cause instanceof Error ? error.cause.message : null;
  const head = error.message.split("\n")[0].slice(0, ERROR_CHARS);
  return cause ? `${head} (${cause})` : head;
}

/** Inserts the steps that do not exist yet. */
export async function ensureSteps(
  db: MeetingDeps["db"],
  runId: string,
  planned: readonly PlannedStep[],
): Promise<void> {
  if (planned.length === 0) return;
  await db
    .insert(runSteps)
    .values(
      planned.map((s) => ({
        runId,
        key: s.key,
        position: s.position,
        role: s.role,
        status: "pending" as const,
      })),
    )
    .onConflictDoNothing();
}

/**
 * Takes the run for this worker, unless a live worker holds it. A run that
 * a later meeting replaced is never taken: its plan was checked against a
 * fund that has changed since.
 */
async function claim(deps: MeetingDeps, runId: string): Promise<Run | null> {
  const now = deps.now();
  const later = alias(runs, "later");
  const claimed = await deps.db
    .update(runs)
    .set({ heartbeatAt: now, status: "running", error: null })
    .where(
      and(
        eq(runs.id, runId),
        inArray(runs.status, ["running", "failed"]),
        or(
          isNull(runs.heartbeatAt),
          lt(runs.heartbeatAt, new Date(now.getTime() - STALE_HEARTBEAT_MS)),
        ),
        notExists(
          deps.db
            .select({ id: later.id })
            .from(later)
            .where(gt(later.asOf, runs.asOf)),
        ),
      ),
    )
    .returning();
  return claimed.at(0) ?? null;
}

/**
 * Runs the steps of a run in order until it completes, a step fails, or
 * the deadline (epoch ms) comes near. Each step that is done is never run
 * again, so a later call continues where this one stopped.
 */
export async function advanceRun(
  deps: MeetingDeps,
  runId: string,
  { deadline }: { deadline: number },
): Promise<AdvanceOutcome> {
  const { db } = deps;
  const run = await claim(deps, runId);
  if (!run) return "busy";
  const beat = setInterval(() => {
    db.update(runs)
      .set({ heartbeatAt: deps.now() })
      .where(eq(runs.id, runId))
      .catch(() => undefined);
  }, HEARTBEAT_MS);
  let outcome: AdvanceOutcome = "paused";
  try {
    await db
      .update(runSteps)
      .set({ status: "pending", startedAt: null })
      .where(and(eq(runSteps.runId, runId), eq(runSteps.status, "running")));
    await ensureSteps(db, runId, stepPlan.initial);

    for (;;) {
      let steps = await stepsOf(deps, runId);
      const extra = await analystSteps.extraSteps(deps, run, steps);
      if (extra.length > 0) {
        await ensureSteps(db, runId, extra);
        steps = await stepsOf(deps, runId);
      }
      const open = steps.filter((s) => !isSettled(s));
      const first = open.at(0);
      if (!first) {
        outcome = "completed";
        break;
      }
      const group = stepPlan.groupOf(first.key);
      const batch = open.filter((s) => stepPlan.groupOf(s.key) === group);
      const results = await mapLimited(batch, PARALLEL_CALLS, (step) =>
        runStep(deps, run, step, steps, deadline),
      );
      const fatal = results.find(
        (r): r is { kind: "failed"; key: string; error: string } =>
          r.kind === "failed" && !stepPlan.isSoft(r.key),
      );
      if (fatal) {
        await db
          .update(runs)
          .set({ status: "failed", error: `${fatal.key}: ${fatal.error}` })
          .where(eq(runs.id, runId));
        outcome = "failed";
        break;
      }
      if (results.some((r) => r.kind === "deadline")) break;
      if (results.some((r) => r.kind === "completed")) {
        outcome = "completed";
        break;
      }
    }
  } catch (error) {
    await db
      .update(runs)
      .set({ status: "failed", error: messageOf(error) })
      .where(eq(runs.id, runId));
    outcome = "failed";
  } finally {
    clearInterval(beat);
    // A release that fails must not hide the error of the run. The claim
    // then ends when the heartbeat becomes stale.
    await db
      .update(runs)
      .set({ heartbeatAt: null })
      .where(eq(runs.id, runId))
      .catch(() => undefined);
  }
  return outcome;
}

async function stepsOf(deps: MeetingDeps, runId: string): Promise<RunStep[]> {
  return deps.db
    .select()
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(runSteps.position), asc(runSteps.key));
}

type StepResult =
  | { kind: "done" | "completed"; key: string }
  | { kind: "deadline"; key: string }
  | { kind: "failed"; key: string; error: string };

async function runStep(
  deps: MeetingDeps,
  run: Run,
  step: RunStep,
  steps: readonly RunStep[],
  deadline: number,
): Promise<StepResult> {
  const { db } = deps;
  const startedAt = deps.now();
  await db
    .update(runSteps)
    .set({ status: "running", startedAt, error: null })
    .where(eq(runSteps.id, step.id));
  const ctx: StepContext = {
    deps,
    run,
    key: step.key,
    deadline,
    steps,
    output: (key, schema) => stepReads.outputOf(steps, key, schema),
  };
  const seconds = () => (deps.now().getTime() - startedAt.getTime()) / 1000;
  const finish = (outcome: StepOutcome) => ({
    status: outcome.status,
    input: outcome.input ?? null,
    output: outcome.output ?? null,
    memo: outcome.memo ?? null,
    model: outcome.model ?? null,
    usage: outcome.usage ?? null,
    error: null,
    finishedAt: deps.now(),
  });
  try {
    if (step.key === "commit") {
      await runTransaction(db, async (tx) => {
        // Two workers can hold one run for a moment, when the heartbeat of
        // the first one became stale. The row lock lets only one commit.
        const locked = await tx
          .select({ status: runs.status })
          .from(runs)
          .where(eq(runs.id, run.id))
          .for("update");
        if (locked.at(0)?.status === "completed") return;
        const outcome = await commitMeeting(
          { ...ctx, deps: { ...deps, db: tx } },
          tx,
        );
        await tx
          .update(runSteps)
          .set(finish(outcome))
          .where(eq(runSteps.id, step.id));
        await tx
          .update(runs)
          .set({ status: "completed", finishedAt: deps.now() })
          .where(eq(runs.id, run.id));
      });
      deps.onStepEnd?.({
        key: step.key,
        status: "done",
        model: null,
        usage: null,
        error: null,
        seconds: seconds(),
      });
      return { kind: "completed", key: step.key };
    }
    const outcome = await runnerFor(step.key)(ctx);
    await db
      .update(runSteps)
      .set(finish(outcome))
      .where(eq(runSteps.id, step.id));
    deps.onStepEnd?.({
      key: step.key,
      status: outcome.status,
      model: outcome.model ?? null,
      usage: outcome.usage ?? null,
      error: null,
      seconds: seconds(),
    });
    return { kind: "done", key: step.key };
  } catch (error) {
    if (error instanceof DeadlineReached) {
      await db
        .update(runSteps)
        .set({ status: "pending", startedAt: null })
        .where(eq(runSteps.id, step.id));
      return { kind: "deadline", key: step.key };
    }
    const failure = error instanceof StepFailure ? error : null;
    const message = messageOf(error);
    await db
      .update(runSteps)
      .set({
        status: "failed",
        input: failure?.input ?? null,
        usage: failure?.usage ?? null,
        model: failure?.model ?? null,
        error: message,
        finishedAt: deps.now(),
      })
      .where(eq(runSteps.id, step.id));
    deps.onStepEnd?.({
      key: step.key,
      status: "failed",
      model: failure?.model ?? null,
      usage: failure?.usage ?? null,
      error: message,
      seconds: seconds(),
    });
    return { kind: "failed", key: step.key, error: message };
  }
}
