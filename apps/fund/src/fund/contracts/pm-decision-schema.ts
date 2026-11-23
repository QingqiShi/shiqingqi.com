import { z } from "zod";
import { positionThesisSchema } from "./fund-thesis-schema.ts";

/**
 * Prices in an agent's answer are quote units (pence for a London stock),
 * because that is what the news and a broker show. Code converts them. An
 * agent gives judgement and never arithmetic.
 */
export const onExpirySchema = z.enum(["cancel", "reprice", "reassess"]);

/**
 * One decision of the PM. There is one for each stock the fund owns (a
 * `hold` when nothing changes) and one for each stock it wants to buy.
 */
export const pmActionSchema = z.object({
  symbol: z.string(),
  action: z.enum(["buy", "sell", "hold", "cancel_order"]),
  /**
   * The weight of the position in the fund once the order fills, in percent.
   * 0 on a sell means sell all that is unlocked. Ignored for `hold` and
   * `cancel_order`.
   */
  targetWeightPct: z.number().nullable(),
  /** In quote units. Null for `hold` and `cancel_order`. */
  limitPrice: z.number().nullable(),
  /** How many sessions the order lives, 1 to 5. */
  validSessions: z.number().int().nullable(),
  onExpiry: onExpirySchema.nullable(),
  /** For `reprice`: the worst limit the PM would accept later, in quote units. */
  repriceLimit: z.number().nullable(),
  /** What the PM will do if the price does not reach the limit. */
  unfilledPlan: z.string().nullable(),
  /** The logic of this decision, for the journal. */
  rationale: z.string(),
  /** Required for a first buy; otherwise only when the thesis changes. */
  thesis: positionThesisSchema.nullable(),
  /** Why the thesis changed, when `thesis` replaces an older one. */
  thesisChangeNote: z.string().nullable(),
});
export type PmAction = z.infer<typeof pmActionSchema>;

export const pmDecisionSchema = z.object({
  marketView: z.string(),
  /** How today's decisions follow the fund thesis and the plan. */
  planCheck: z.string(),
  actions: z.array(pmActionSchema),
  /** Required when no action is a buy or a sell: why doing nothing is right. */
  noActionReason: z.string().nullable(),
  /** Only in the draft: what the PM wants an analyst to answer. */
  questions: z.array(z.object({ symbol: z.string(), question: z.string() })),
  /** Only in the final: the answer to each point the risk officer made. */
  replyToRisk: z.string().nullable(),
  /** True when the fund thesis or the risk policy no longer fits. */
  requestStrategyReview: z.boolean(),
  strategyReviewReason: z.string().nullable(),
});
export type PmDecision = z.infer<typeof pmDecisionSchema>;
