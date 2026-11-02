import { COUNTDOWN_MS, selectHomeCard } from "./select-home-card.ts";
import type { HomeStatus } from "./types.ts";

const POLL_RUN_MS = 3000;
const POLL_NEAR_ORGANISE_MS = 15_000;
const POLL_IDLE_MS = 60_000;

/** How long to wait before the next poll. An idle wait ends when the countdown starts. */
export function pollDelayMs(status: HomeStatus, nowMs: number): number {
  const { kind } = selectHomeCard(status, nowMs);
  if (kind === "running") return POLL_RUN_MS;
  if (kind !== "none") return POLL_NEAR_ORGANISE_MS;
  if (status.nextOrganiseAt === null) return POLL_IDLE_MS;
  const untilCountdown =
    Date.parse(status.nextOrganiseAt) - COUNTDOWN_MS - nowMs;
  return untilCountdown > 0
    ? Math.min(untilCountdown, POLL_IDLE_MS)
    : POLL_IDLE_MS;
}
