import type { FundDb } from "#src/db/types.ts";
import { advanceRun } from "../advance-run.ts";
import { startMeeting } from "../start-meeting.ts";
import type { AgentRequest, MeetingDeps } from "../types.ts";
import { fakeAgent } from "./fake-agent.ts";
import { MEETING_DAY } from "./seed-test-market.ts";

const FAR_DEADLINE_MS = 3_600_000;

/**
 * Holds the meeting of `asOf` (by default `MEETING_DAY`) with the fake model.
 * `overrides` change its canned answers.
 */
export async function holdTestMeeting(
  db: FundDb,
  overrides: Parameters<typeof fakeAgent>[0] = {},
  { asOf = MEETING_DAY }: { asOf?: string } = {},
) {
  const calls: AgentRequest<unknown>[] = [];
  const deps = (agent: MeetingDeps["agent"]): MeetingDeps => ({
    db,
    agent,
    language: "en",
    refreshMarket: null,
    now: () => new Date(),
  });
  const advance = (runId: string, agent: MeetingDeps["agent"]) =>
    advanceRun(deps(agent), runId, {
      deadline: Date.now() + FAR_DEADLINE_MS,
    });

  const started = await startMeeting(db, {
    asOf,
    tier: "dev",
    language: "en",
  });
  if (started.status !== "started") throw new Error(started.status);
  const agent = fakeAgent(overrides, calls);
  const outcome = await advance(started.runId, agent);
  return {
    runId: started.runId,
    outcome,
    calls,
    advanceAgain: () => advance(started.runId, agent),
  };
}
