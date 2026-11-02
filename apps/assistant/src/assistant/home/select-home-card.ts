import { isRunLive } from "./is-run-live.ts";
import { ORGANISE_INTERVAL_MINUTES } from "./next-organise-at.ts";
import type { HomeRun, HomeStatus } from "./types.ts";

const ORGANISE_INTERVAL_MS = ORGANISE_INTERVAL_MINUTES * 60_000;
export const COUNTDOWN_MS = 3 * 60_000;
const CHECKING_MS = 90_000;

/** What the status card of `/` says. */
export type HomeCard =
  | { kind: "running"; run: HomeRun; elapsedMs: number }
  | { kind: "countdown"; remainingMs: number }
  | { kind: "checking"; endsAtMs: number }
  | { kind: "none" };

/**
 * A live run comes first; else the countdown in the last minutes before the
 * organise cron is due, and then a short time in which it checks the inbox.
 */
export function selectHomeCard(status: HomeStatus, nowMs: number): HomeCard {
  const { run, nextOrganiseAt } = status;
  if (run) {
    const startedAtMs = Date.parse(run.startedAt);
    if (isRunLive(run.task, startedAtMs, nowMs)) {
      return {
        kind: "running",
        run,
        elapsedMs: Math.max(0, nowMs - startedAtMs),
      };
    }
  }
  if (nextOrganiseAt === null) return { kind: "none" };
  const next = Date.parse(nextOrganiseAt);
  const remainingMs = next - nowMs;
  const lastDue = remainingMs > 0 ? next - ORGANISE_INTERVAL_MS : next;
  const checkingEndsAtMs = lastDue + CHECKING_MS;
  if (nowMs < checkingEndsAtMs) {
    return { kind: "checking", endsAtMs: checkingEndsAtMs };
  }
  return remainingMs > 0 && remainingMs <= COUNTDOWN_MS
    ? { kind: "countdown", remainingMs }
    : { kind: "none" };
}
