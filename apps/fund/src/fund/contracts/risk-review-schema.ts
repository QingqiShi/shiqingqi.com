import { z } from "zod";
import { riskPolicySchema } from "./risk-policy-schema.ts";
import {
  firstVersionSchema,
  versionReviewSchema,
} from "./version-review-schema.ts";

/**
 * The risk officer's review of the risk policy and of the PM's draft. The
 * policy comes first, so that the officer judges the draft against the
 * policy that is in effect today.
 */
export const riskReviewSchema = z.object({
  policyReview: versionReviewSchema(riskPolicySchema),
  overall: z.string(),
  verdicts: z.array(
    z.object({
      symbol: z.string(),
      verdict: z.enum(["approve", "reduce", "reject"]),
      /** For `reduce`: the largest weight the officer accepts. */
      maxWeightPct: z.number().nullable(),
      reason: z.string(),
    }),
  ),
  /** For each risk factor that the trades move: where it lands and whether that is intended. */
  factorNotes: z.array(z.object({ factor: z.string(), note: z.string() })),
  portfolioConcerns: z.array(z.string()),
  requiredChanges: z.array(z.string()),
});
export type RiskReview = z.infer<typeof riskReviewSchema>;
export type PolicyReview = RiskReview["policyReview"];

/** The review when the fund has no risk policy yet: the officer must write the first one. */
export const firstRiskReviewSchema = riskReviewSchema.extend({
  policyReview: firstVersionSchema(riskPolicySchema),
});

/** The risk officer's last word on the final orders. A veto drops the order. */
export const riskSignoffSchema = z.object({
  statement: z.string(),
  verdicts: z.array(
    z.object({
      symbol: z.string(),
      verdict: z.enum(["approved", "vetoed"]),
      reason: z.string(),
    }),
  ),
});
export type RiskSignoff = z.infer<typeof riskSignoffSchema>;
