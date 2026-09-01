import { z } from "zod";

/** Daily export file entry (not an API response — hand-written). */
export const dailyExportEntrySchema = z.object({
  id: z.number(),
  adult: z.boolean().optional().default(false),
  popularity: z.number(),
  video: z.boolean().optional(),
});
