import { z } from "zod";
import {
  fundThesisSchema,
  positionThesisSchema,
} from "./fund-thesis-schema.ts";
import {
  firstVersionSchema,
  versionReviewSchema,
} from "./version-review-schema.ts";

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

/**
 * `thesisReview` comes first, so that the PM reviews the fund thesis before
 * it decides. In the final decision it is the PM's last word: a revision of
 * the draft that the final does not repeat is dropped.
 */
export const pmDecisionSchema = z.object({
  thesisReview: versionReviewSchema(fundThesisSchema),
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
});
export type PmDecision = z.infer<typeof pmDecisionSchema>;
export type ThesisReview = PmDecision["thesisReview"];

/** The PM's answer when the fund has no thesis yet: it must write the first one. */
export const firstPmDecisionSchema = pmDecisionSchema.extend({
  thesisReview: firstVersionSchema(fundThesisSchema),
});
