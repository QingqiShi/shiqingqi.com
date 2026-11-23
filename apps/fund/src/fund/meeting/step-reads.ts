import type { z } from "zod";
import type { AnalystNote } from "../contracts/analyst-note-schema.ts";
import type { RunStep } from "../types.ts";
import { stepOutputs } from "./step-outputs.ts";
import { stepPlan } from "./step-plan.ts";

function stepOf(steps: readonly RunStep[], key: string): RunStep | undefined {
  return steps.find((s) => s.key === key);
}

/** The output of a step that is done, checked by `schema`; null otherwise. */
function outputOf<T>(
  steps: readonly RunStep[],
  key: string,
  schema: z.ZodType<T>,
): T | null {
  const step = stepOf(steps, key);
  return step?.status === "done" ? schema.parse(step.output) : null;
}

/** The symbols of the analysts, in their order: the stocks on today's table. */
function tableSymbols(steps: readonly RunStep[]): string[] {
  return steps
    .filter((s) => s.key.startsWith("analyst:"))
    .sort((a, b) => a.position - b.position)
    .map((s) => stepPlan.symbolOf(s.key));
}

function analystNotes(steps: readonly RunStep[]) {
  const found = new Map<string, AnalystNote>();
  const failures = new Map<string, string>();
  for (const step of steps) {
    if (!step.key.startsWith("analyst:")) continue;
    const symbol = stepPlan.symbolOf(step.key);
    if (step.status === "done") {
      found.set(symbol, stepOutputs.analyst.parse(step.output));
    } else {
      failures.set(symbol, step.error ?? step.status);
    }
  }
  return { found, failures };
}

/** Reads of the steps of a run that several steps share. */
export const stepReads = { stepOf, outputOf, tableSymbols, analystNotes };
