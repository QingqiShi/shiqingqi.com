import { asc, eq } from "drizzle-orm";
import type { FundDb } from "#src/db/types.ts";
import { runs, runSteps } from "../fund-schema.ts";
import type { Run, RunStep } from "../types.ts";
import { isHeld } from "./advance-run.ts";

export interface MeetingStatus {
  status: Run["status"];
  /** True while a worker advances the run. A run that is `running` and not held has paused or lost its worker. */
  held: boolean;
  error: string | null;
  steps: { key: string; role: RunStep["role"]; status: RunStep["status"] }[];
}

/** What a page that polls a run needs; null when there is no such run. */
export async function meetingStatus(
  db: FundDb,
  runId: string,
  now: Date,
): Promise<MeetingStatus | null> {
  const run = (await db.select().from(runs).where(eq(runs.id, runId))).at(0);
  if (!run) return null;
  const steps = await db
    .select({ key: runSteps.key, role: runSteps.role, status: runSteps.status })
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(runSteps.position), asc(runSteps.key));
  return {
    status: run.status,
    held: isHeld(run, now),
    error: run.error,
    steps,
  };
}
