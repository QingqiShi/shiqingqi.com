import { z } from "zod";
import { sourceSchema } from "./source-schema.ts";

/** One analyst's note on one stock. */
export const analystNoteSchema = z.object({
  symbol: z.string(),
  stance: z.enum(["strong_buy", "buy", "hold", "reduce", "sell"]),
  conviction: z.number().int().min(1).max(5),
  summary: z.string(),
  bull: z.array(z.string()),
  bear: z.array(z.string()),
  /** The earnings picture: trend, quality, the last report, the next one. */
  earnings: z.string(),
  valuation: z.string(),
  news: z.array(
    z.object({ date: z.string(), headline: z.string(), takeaway: z.string() }),
  ),
  catalysts: z.array(z.string()),
  /** For a stock the fund owns: does the thesis still hold? */
  thesisCheck: z.enum(["intact", "weakened", "broken", "not_held"]),
  thesisCheckReason: z.string(),
  /** A fair range to buy in, in quote units; null when the analyst would not buy. */
  entryLow: z.number().nullable(),
  entryHigh: z.number().nullable(),
  riskFlags: z.array(z.string()),
  sources: z.array(sourceSchema),
});
export type AnalystNote = z.infer<typeof analystNoteSchema>;

export const analystAnswerSchema = z.object({
  symbol: z.string(),
  answer: z.string(),
});
export type AnalystAnswer = z.infer<typeof analystAnswerSchema>;
