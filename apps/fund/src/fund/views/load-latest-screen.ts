import { and, desc, eq } from "drizzle-orm";
import "server-only";
import type { FundDb } from "#src/db/types.ts";
import { runSteps, runs } from "../fund-schema.ts";
import { stepOutputs } from "../meeting/step-outputs.ts";
import type { ScreenResult } from "../screener/screen-universe.ts";

export interface LatestScreen {
  runId: string;
  result: ScreenResult;
}

/** The newest screen a meeting ran, or null when none has run or its output has another shape. */
export async function loadLatestScreen(
  db: FundDb,
): Promise<LatestScreen | null> {
  const step = (
    await db
      .select({ runId: runSteps.runId, output: runSteps.output })
      .from(runSteps)
      .innerJoin(runs, eq(runs.id, runSteps.runId))
      .where(and(eq(runSteps.key, "screen"), eq(runSteps.status, "done")))
      .orderBy(desc(runs.asOf), desc(runs.createdAt))
      .limit(1)
  ).at(0);
  if (step === undefined) return null;
  const output = stepOutputs.screen.safeParse(step.output);
  return output.success
    ? { runId: step.runId, result: output.data.result }
    : null;
}
