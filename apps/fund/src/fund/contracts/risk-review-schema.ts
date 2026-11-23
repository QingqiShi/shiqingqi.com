import { z } from "zod";

/** The risk officer's review of the PM's draft. */
export const riskReviewSchema = z.object({
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
