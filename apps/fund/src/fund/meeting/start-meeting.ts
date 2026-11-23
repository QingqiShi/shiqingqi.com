import { and, eq, lt } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import type { ModelTier } from "../agents/model-for.ts";
import { orders, runs } from "../fund-schema.ts";
import { ordersNeedingCheck } from "../orders/orders-needing-check.ts";
import type { Run } from "../types.ts";
import { ensureSteps } from "./advance-run.ts";
import { hasFundThesis, latestRiskPolicy } from "./load-fund-state.ts";
import { stepPlan } from "./step-plan.ts";

export type StartMeetingResult =
  | { status: "started" | "running" | "completed"; runId: string }
  | { status: "blocked"; ordersToCheck: string[] }
  | { status: "needs_strategy" };

/**
 * Creates the run of `kind` for the session `asOf`, or finds the one that
 * exists. A daily meeting needs a fund thesis and a risk policy, and waits
 * while the owner has not said what happened to an open order. It does not
 * advance the run: call `advanceRun` for that.
 */
export async function startMeeting(
  db: FundDb,
  { kind, asOf, tier }: { kind: Run["kind"]; asOf: string; tier: ModelTier },
): Promise<StartMeetingResult> {
  const existing = await runOf(db, kind, asOf);
  if (existing) {
    return {
      status: existing.status === "completed" ? "completed" : "running",
      runId: existing.id,
    };
  }
  if (kind === "daily") {
    if (!(await latestRiskPolicy(db)) || !(await hasFundThesis(db))) {
      return { status: "needs_strategy" };
    }
    const open = await db
      .select()
      .from(orders)
      .where(eq(orders.status, "open"));
    const toCheck = ordersNeedingCheck(open, asOf);
    if (toCheck.length > 0) {
      return {
        status: "blocked",
        ordersToCheck: toCheck.map(({ order }) => order.id),
      };
    }
  }
  const created = (
    await db
      .insert(runs)
      .values({ kind, asOf, status: "running", modelTier: tier })
      .onConflictDoNothing()
      .returning()
  ).at(0);
  if (!created) {
    const raced = await runOf(db, kind, asOf);
    if (!raced)
      throw new Error(`The ${kind} run of ${asOf} could not be created.`);
    return { status: "running", runId: raced.id };
  }
  await db
    .update(runs)
    .set({ status: "failed", error: "A later meeting replaced this one." })
    .where(
      and(eq(runs.kind, kind), lt(runs.asOf, asOf), eq(runs.status, "running")),
    );
  await ensureSteps(db, created.id, stepPlan.initial(kind));
  return { status: "started", runId: created.id };
}

async function runOf(db: FundDb, kind: Run["kind"], asOf: string) {
  const run = (
    await db
      .select()
      .from(runs)
      .where(and(eq(runs.kind, kind), eq(runs.asOf, asOf)))
  ).at(0);
  return run ?? null;
}
