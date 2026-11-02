import {
  storableActivity,
  type AgentActivity,
  type AgentRunProgress,
} from "./agent-activity.ts";
import type { ToolCallObserver } from "./agent-tool.ts";

const MAX_RECENT = 6;
const WRITE_INTERVAL_MS = 1000;
/** How long the end of a run waits for a write that has started. */
const SETTLE_MS = 2000;

function logFailedWrite(error: unknown) {
  // Drizzle puts the query's values in its message, and these hold mail
  // subjects. The cause has only the database's error.
  const cause = error instanceof Error && error.cause ? error.cause : error;
  console.error(
    "Agent progress write failed",
    cause instanceof Error ? cause.message : "unknown error",
  );
}

/**
 * Follows the tool calls of a run and writes what they do. It holds only the
 * newest state and has one write at a time, at most one a second, so that
 * calls in parallel cannot write out of order and no call waits for the
 * database. A failed write is logged and the next change tries again.
 */
export function trackRunProgress(
  write: (progress: AgentRunProgress) => Promise<void>,
) {
  const inFlight = new Map<symbol, AgentActivity>();
  let recent: AgentActivity[] = [];
  let changed = false;
  let settled = false;
  let writing: Promise<void> | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let lastWriteAt = Number.NEGATIVE_INFINITY;

  function schedule() {
    if (settled || !changed || writing || timer) return;
    timer = setTimeout(
      () => {
        timer = null;
        changed = false;
        lastWriteAt = Date.now();
        writing = write({ inFlight: [...inFlight.values()], recent })
          .catch(logFailedWrite)
          .finally(() => {
            writing = null;
            schedule();
          });
      },
      Math.max(0, lastWriteAt + WRITE_INTERVAL_MS - Date.now()),
    );
  }

  const observe: ToolCallObserver = (described) => {
    const activity = storableActivity(described);
    const call = Symbol();
    inFlight.set(call, activity);
    changed = true;
    schedule();
    return () => {
      inFlight.delete(call);
      recent = [activity, ...recent].slice(0, MAX_RECENT);
      changed = true;
      schedule();
    };
  };

  return {
    observe,
    /** Stops the writes, and waits a short time for the one that has started. */
    settle: async () => {
      settled = true;
      if (timer) clearTimeout(timer);
      if (!writing) return;
      let timeout: ReturnType<typeof setTimeout> | undefined;
      await Promise.race([
        writing,
        new Promise((resolve) => {
          timeout = setTimeout(resolve, SETTLE_MS);
        }),
      ]);
      clearTimeout(timeout);
    },
  };
}
