import { z } from "zod";

export type MediaMetadata = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  title: string;
  originalTitle: string;
  overview: string;
  genreIds: number[];
  releaseYear: number;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  posterPath: string | null;
  originalLanguage: string;
  directors: string[];
  cast: string[];
  streamingPlatforms: string[];
};

export const vectorSearchFiltersSchema = z.object({
  mediaType: z.enum(["movie", "tv"]).optional(),
  genreIds: z.array(z.number().int()).optional(),
  releaseYearMin: z.number().int().optional(),
  releaseYearMax: z.number().int().optional(),
  voteAverageMin: z.number().optional(),
  originalLanguage: z.string().optional(),
  directors: z.array(z.string()).optional(),
  cast: z.array(z.string()).optional(),
  streamingPlatforms: z.array(z.string()).optional(),
});

export type VectorSearchFilters = z.infer<typeof vectorSearchFiltersSchema>;

export type VectorSearchResult = Pick<
  MediaMetadata,
  | "tmdbId"
  | "mediaType"
  | "title"
  | "overview"
  | "releaseYear"
  | "voteAverage"
  | "posterPath"
  | "genreIds"
  | "directors"
  | "cast"
  | "streamingPlatforms"
> & { id: string; score: number };
