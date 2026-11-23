import { z } from "zod";
import {
  analystAnswerSchema,
  analystNoteSchema,
} from "../contracts/analyst-note-schema.ts";
import { macroBriefSchema } from "../contracts/macro-brief-schema.ts";
import { pmDecisionSchema } from "../contracts/pm-decision-schema.ts";
import {
  riskReviewSchema,
  riskSignoffSchema,
} from "../contracts/risk-review-schema.ts";
import type { DataOutput, ScreenOutput } from "./common-steps.ts";
import type { ChecksOutput, FinalChecksOutput } from "./daily-steps.ts";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

/**
 * The output of each step, as a later step reads it back from `run_steps`.
 * An agent's answer is checked against its schema again; an output that
 * code wrote is only checked for its shape.
 */
export const stepOutputs = {
  data: z.custom<DataOutput>(isRecord),
  screen: z.custom<ScreenOutput>(
    (value) => isRecord(value) && isRecord(value.result),
  ),
  macro: macroBriefSchema,
  analyst: analystNoteSchema,
  answer: analystAnswerSchema,
  pm: pmDecisionSchema,
  checks: z.custom<ChecksOutput>(
    (value) => isRecord(value) && isRecord(value.plan),
  ),
  finalChecks: z.custom<FinalChecksOutput>(
    (value) =>
      isRecord(value) &&
      isRecord(value.plan) &&
      Array.isArray(value.plan.blocked) &&
      Array.isArray(value.actions),
  ),
  review: riskReviewSchema,
  signoff: riskSignoffSchema,
  pack: z.array(z.object({ title: z.string(), body: z.unknown() })),
};
