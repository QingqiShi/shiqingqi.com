import { z } from "zod";

export const stepUsageSchema = z.object({
  /** All input tokens, the cache reads and writes included. */
  inputTokens: z.number(),
  outputTokens: z.number(),
  cacheReadTokens: z.number(),
  cacheWriteTokens: z.number(),
  webSearches: z.number(),
  /** The error code of each search that failed. */
  webSearchErrors: z.array(z.string()).optional(),
  /** An estimate from list prices. */
  costUsd: z.number(),
});
export type StepUsage = z.infer<typeof stepUsageSchema>;
