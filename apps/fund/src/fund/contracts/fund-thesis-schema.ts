import { z } from "zod";

/** How the rule screen weighs its five scores. Code normalises the sum to 1. */
export const screenWeightsSchema = z.object({
  value: z.number().min(0),
  quality: z.number().min(0),
  momentum: z.number().min(0),
  growth: z.number().min(0),
  lowVolatility: z.number().min(0),
});
export type ScreenWeights = z.infer<typeof screenWeightsSchema>;

/** The mandate and the long-term plan of the fund, written by the PM. */
export const fundThesisSchema = z.object({
  summary: z.string(),
  philosophy: z.string(),
  objective: z.string(),
  /** The edge the fund claims, and why it should last. */
  edge: z.string(),
  horizon: z.string(),
  portfolioConstruction: z.object({
    minPositions: z.number().int(),
    maxPositions: z.number().int(),
    typicalWeightPct: z.number(),
    cashPolicy: z.string(),
  }),
  /** The steps from all cash to the target portfolio, and after. */
  plan: z.array(z.object({ phase: z.string(), description: z.string() })),
  screenWeights: screenWeightsSchema,
  /** How the fund sizes and sells when no lot can be sold for 30 days. */
  holdingDiscipline: z.string(),
  sellDiscipline: z.string(),
});
export type FundThesis = z.infer<typeof fundThesisSchema>;

/** Why the fund owns one stock. */
export const positionThesisSchema = z.object({
  summary: z.string(),
  drivers: z.array(z.string()),
  /** Facts that would prove the thesis wrong; each one can be checked. */
  invalidation: z.array(z.string()),
  horizonMonths: z.number(),
  /** What the stock is worth and how the PM got there. */
  valuation: z.string(),
});
export type PositionThesis = z.infer<typeof positionThesisSchema>;
