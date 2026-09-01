import { z } from "zod";

export const vectorSearchFiltersSchema = z.object({
  mediaType: z.enum(["movie", "tv"]).optional(),
  genreIds: z.array(z.number().int()).optional(),
  releaseYearMin: z.number().int().optional(),
  releaseYearMax: z.number().int().optional(),
  voteAverageMin: z.number().optional(),
  originalLanguage: z
    .string()
    .regex(/^[a-z]{2}$/)
    .optional(),
  directorIds: z.array(z.number().int()).optional(),
  castIds: z.array(z.number().int()).optional(),
  streamingPlatforms: z.array(z.string().max(100)).optional(),
});

export type VectorSearchFilters = z.infer<typeof vectorSearchFiltersSchema>;
