import { runTransaction } from "@tuja/server-db/run-transaction";
import { and, eq, lt } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import type { ModelTier } from "../agents/model-for.ts";
import type { ReportLanguage } from "../agents/prompts.ts";
import { cashEntries, orders, runs } from "../fund-schema.ts";
import { GUARDRAILS } from "../guardrails.ts";
import { ordersNeedingCheck } from "../orders/orders-needing-check.ts";
import { ensureSteps } from "./advance-run.ts";
import { sayIn } from "./memos.ts";
import { stepPlan } from "./step-plan.ts";

const STARTING_DEPOSIT_KEY = "deposit:start";

export type StartMeetingResult =
  | { status: "started" | "running" | "completed"; runId: string }
  | { status: "blocked"; ordersToCheck: string[] };

/**
 * Creates the run for the session `asOf`, or finds the one that exists. A
 * meeting waits while the owner has not said what happened to an open
 * order. The first run also books the starting deposit, so that the first
 * meeting can buy. It does not advance the run: call `advanceRun` for that.
 */
export async function startMeeting(
  db: FundDb,
  {
    asOf,
    tier,
    language,
  }: { asOf: string; tier: ModelTier; language: ReportLanguage },
): Promise<StartMeetingResult> {
  const existing = await runOf(db, asOf);
  if (existing) {
    return {
      status: existing.status === "completed" ? "completed" : "running",
      runId: existing.id,
    };
  }
  const open = await db.select().from(orders).where(eq(orders.status, "open"));
  const toCheck = ordersNeedingCheck(open, asOf);
  if (toCheck.length > 0) {
    return {
      status: "blocked",
      ordersToCheck: toCheck.map(({ order }) => order.id),
    };
  }
  const created = await runTransaction(db, async (tx) => {
    const run = (
      await tx
        .insert(runs)
        .values({ asOf, status: "running", modelTier: tier })
        .onConflictDoNothing()
        .returning()
    ).at(0);
    if (!run) return null;
    await tx
      .insert(cashEntries)
      .values({
        date: asOf,
        kind: "deposit",
        amountGbp: GUARDRAILS.startingCashGbp,
        dedupeKey: STARTING_DEPOSIT_KEY,
        note: sayIn(language)("Starting capital", "初始资金"),
      })
      .onConflictDoNothing();
    await tx
      .update(runs)
      .set({ status: "failed", error: "A later meeting replaced this one." })
      .where(and(lt(runs.asOf, asOf), eq(runs.status, "running")));
    await ensureSteps(tx, run.id, stepPlan.initial);
    return run;
  });
  if (!created) {
    const raced = await runOf(db, asOf);
    if (!raced) throw new Error(`The run of ${asOf} could not be created.`);
    return { status: "running", runId: raced.id };
  }
  return { status: "started", runId: created.id };
}

/** True once the owner has started the first meeting of the fund. */
export async function hasAnyMeeting(db: FundDb): Promise<boolean> {
  const rows = await db.select({ id: runs.id }).from(runs).limit(1);
  return rows.length > 0;
}

async function runOf(db: FundDb, asOf: string) {
  const run = (await db.select().from(runs).where(eq(runs.asOf, asOf))).at(0);
  return run ?? null;
}
