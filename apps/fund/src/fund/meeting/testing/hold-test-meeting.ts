import type { FundDb } from "#src/db/types.ts";
import { advanceRun } from "../advance-run.ts";
import { startMeeting } from "../start-meeting.ts";
import type { AgentRequest, MeetingDeps } from "../types.ts";
import { fakeAgent } from "./fake-agent.ts";
import { MEETING_DAY } from "./seed-test-market.ts";

const FAR_DEADLINE_MS = 3_600_000;

/**
 * Holds the first strategy session and then the daily meeting of
 * `MEETING_DAY` with the fake model. `overrides` change the canned answers of
 * the daily meeting only.
 */
export async function holdTestMeeting(
  db: FundDb,
  overrides: Parameters<typeof fakeAgent>[0] = {},
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

  const strategy = await startMeeting(db, {
    kind: "strategy",
    asOf: MEETING_DAY,
    tier: "dev",
  });
  if (strategy.status !== "started") throw new Error(strategy.status);
  const strategyOutcome = await advance(strategy.runId, fakeAgent());
  if (strategyOutcome !== "completed") throw new Error(strategyOutcome);

  const daily = await startMeeting(db, {
    kind: "daily",
    asOf: MEETING_DAY,
    tier: "dev",
  });
  if (daily.status !== "started") throw new Error(daily.status);
  const agent = fakeAgent(overrides, calls);
  const outcome = await advance(daily.runId, agent);
  return {
    runId: daily.runId,
    outcome,
    calls,
    advanceAgain: () => advance(daily.runId, agent),
  };
}
