import { getAnthropicProvider } from "@tuja/server-clients/get-anthropic-provider";
import { after } from "next/server";
import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { reportLanguageFromEnv } from "../agents/prompts.ts";
import { refreshMarketData } from "../market/refresh-market-data.ts";
import { yahooMarketProvider } from "../market/yahoo-market-provider.ts";
import { advanceRun } from "./advance-run.ts";
import { anthropicAgentCaller } from "./anthropic-agent-caller.ts";
import type { MeetingDeps } from "./types.ts";

/** The `maxDuration` of each route that calls this, in seconds. */
const MEETING_ROUTE_SECONDS = 800;
/** Time kept free at the end of the invocation for the last database writes. */
const MARGIN_MS = 40_000;

function serverMeetingDeps(): MeetingDeps {
  const db = getFundDb();
  return {
    db,
    agent: (request) => anthropicAgentCaller(getAnthropicProvider())(request),
    language: reportLanguageFromEnv(process.env.FUND_REPORT_LANGUAGE),
    refreshMarket: (symbols) =>
      refreshMarketData(db, {
        now: new Date(),
        provider: yahooMarketProvider(),
        symbols,
      }),
    now: () => new Date(),
  };
}

/**
 * Advances the run after the response is sent, until the run ends or this
 * invocation nears its `maxDuration`. A later call (the next cron, or a
 * resume) continues a run that paused.
 */
export function advanceAfterResponse(runId: string): void {
  const deadline = Date.now() + MEETING_ROUTE_SECONDS * 1000 - MARGIN_MS;
  after(async () => {
    const outcome = await advanceRun(serverMeetingDeps(), runId, { deadline });
    console.info(`Meeting run ${runId}: ${outcome}.`);
  });
}
