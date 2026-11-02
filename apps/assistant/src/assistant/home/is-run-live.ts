import type { AgentTask } from "#src/assistant/db/schema.ts";

/** The `maxDuration` of each task's route: the platform stops the function after it. */
export const AGENT_RUN_MAX_MS: Record<AgentTask, number> = {
  organise: 300_000,
  report: 800_000,
  "report-preview": 800_000,
};

export const LONGEST_RUN_MS = Math.max(...Object.values(AGENT_RUN_MAX_MS));

/** A run with the status `running` that is older than its function can live has died with it. */
export function isRunLive(
  task: AgentTask,
  startedAtMs: number,
  nowMs: number,
): boolean {
  return nowMs - startedAtMs <= AGENT_RUN_MAX_MS[task];
}
