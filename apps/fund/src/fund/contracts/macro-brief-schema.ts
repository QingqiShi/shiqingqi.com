import { z } from "zod";
import { sourceSchema } from "./source-schema.ts";

/** The strategist's view of markets and news before the open. */
export const macroBriefSchema = z.object({
  summary: z.string(),
  regime: z.string(),
  themes: z.array(
    z.object({
      title: z.string(),
      detail: z.string(),
      /** Symbols of the universe that the theme helps or hurts. */
      symbols: z.array(z.string()),
    }),
  ),
  risks: z.array(z.string()),
  calendar: z.array(z.object({ date: z.string(), event: z.string() })),
  /** At most 3 stocks of the universe that the news makes worth a look. */
  nominations: z.array(z.object({ symbol: z.string(), reason: z.string() })),
  sources: z.array(sourceSchema),
});
export type MacroBrief = z.infer<typeof macroBriefSchema>;
