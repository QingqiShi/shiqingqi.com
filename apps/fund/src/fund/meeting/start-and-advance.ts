import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { modelTierFromEnv } from "../agents/model-for.ts";
import { reportLanguageFromEnv } from "../agents/prompts.ts";
import { advanceAfterResponse } from "./advance-after-response.ts";
import { startMeeting, type StartMeetingResult } from "./start-meeting.ts";

/**
 * Starts the meeting for `asOf`, or finds it, and advances a run that is not
 * completed after the response is sent.
 */
export async function startAndAdvance({
  asOf,
}: {
  asOf: string;
}): Promise<StartMeetingResult> {
  const result = await startMeeting(getFundDb(), {
    asOf,
    tier: modelTierFromEnv(process.env.FUND_MODEL_TIER),
    language: reportLanguageFromEnv(process.env.FUND_REPORT_LANGUAGE),
  });
  if (result.status === "started" || result.status === "running") {
    advanceAfterResponse(result.runId);
  }
  return result;
}
