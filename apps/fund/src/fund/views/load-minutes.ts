import { asc, eq, sql } from "drizzle-orm";
import "server-only";
import { z } from "zod";
import type { FundDb } from "#src/db/types.ts";
import { sourceSchema } from "../contracts/source-schema.ts";
import {
  stepUsageSchema,
  type StepUsage,
} from "../contracts/step-usage-schema.ts";
import { runSteps, runs } from "../fund-schema.ts";
import type { Run, RunStep } from "../types.ts";

export type MinutesStep = Pick<
  RunStep,
  "id" | "key" | "role" | "status" | "memo" | "model" | "error"
> & {
  usage: StepUsage | null;
  sources: z.infer<typeof sourceSchema>[];
};

export interface MinutesView {
  run: Pick<Run, "id" | "asOf" | "status">;
  steps: MinutesStep[];
  models: string[];
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
  costUsd: number;
}

const sourcesSchema = z.array(sourceSchema);

/** One meeting as minutes: every step in order, with what each agent wrote and cost. Null when there is no such run. */
export async function loadMinutes(
  db: FundDb,
  runId: string,
): Promise<MinutesView | null> {
  const run = (
    await db
      .select({
        id: runs.id,
        asOf: runs.asOf,
        status: runs.status,
      })
      .from(runs)
      .where(eq(runs.id, runId))
  ).at(0);
  if (run === undefined) return null;
  const rows = await db
    .select({
      id: runSteps.id,
      key: runSteps.key,
      role: runSteps.role,
      status: runSteps.status,
      memo: runSteps.memo,
      model: runSteps.model,
      error: runSteps.error,
      usage: runSteps.usage,
      sources: sql<unknown>`${runSteps.output}->'sources'`,
    })
    .from(runSteps)
    .where(eq(runSteps.runId, runId))
    .orderBy(asc(runSteps.position));
  const steps = rows.map((row) => {
    const usage = stepUsageSchema.safeParse(row.usage);
    const sources = sourcesSchema.safeParse(row.sources);
    return {
      id: row.id,
      key: row.key,
      role: row.role,
      status: row.status,
      memo: row.memo,
      model: row.model,
      error: row.error,
      usage: usage.success ? usage.data : null,
      sources: sources.success ? sources.data : [],
    };
  });
  const sum = (pick: (usage: StepUsage) => number) =>
    steps.reduce(
      (total, step) => total + (step.usage === null ? 0 : pick(step.usage)),
      0,
    );
  return {
    run,
    steps,
    models: [
      ...new Set(
        steps.flatMap((step) => (step.model === null ? [] : [step.model])),
      ),
    ],
    inputTokens: sum((usage) => usage.inputTokens),
    outputTokens: sum((usage) => usage.outputTokens),
    webSearches: sum((usage) => usage.webSearches),
    costUsd: sum((usage) => usage.costUsd),
  };
}
