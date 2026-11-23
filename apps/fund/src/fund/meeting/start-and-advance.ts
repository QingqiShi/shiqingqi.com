import "server-only";
import { getFundDb } from "#src/db/get-fund-db.ts";
import { modelTierFromEnv } from "../agents/model-for.ts";
import type { Run } from "../types.ts";
import { advanceAfterResponse } from "./advance-after-response.ts";
import { startMeeting, type StartMeetingResult } from "./start-meeting.ts";

/**
 * Starts the meeting of `kind` for `asOf`, or finds it, and advances a run
 * that is not completed after the response is sent.
 */
export async function startAndAdvance({
  kind,
  asOf,
}: {
  kind: Run["kind"];
  asOf: string;
}): Promise<StartMeetingResult> {
  const result = await startMeeting(getFundDb(), {
    kind,
    asOf,
    tier: modelTierFromEnv(process.env.FUND_MODEL_TIER),
  });
  if (result.status === "started" || result.status === "running") {
    advanceAfterResponse(result.runId);
  }
  return result;
}
