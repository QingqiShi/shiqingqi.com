import type { HomeRun } from "./types.ts";

export interface RunChange {
  change: "started" | "finished";
  task: HomeRun["task"];
}

/** What a screen reader hears when a poll sees another run than the last one. */
export function runChange(
  previous: HomeRun | null,
  next: HomeRun | null,
): RunChange | null {
  if (previous?.id === next?.id) return null;
  if (next) return { change: "started", task: next.task };
  return previous ? { change: "finished", task: previous.task } : null;
}
