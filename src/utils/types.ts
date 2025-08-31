import type { z } from "zod";
import type {
  discoverTvQueryParams,
  genreMovieListResponse,
  movieDetailsResponse,
  movieVideosResponse,
  tvSeriesDetailsResponse,
  tvSeriesVideosResponse,
} from "@/_generated/tmdb-zod-schemas";

export type MediaListItem = {
  id: number;
  title?: string;
  posterPath?: string;
  rating?: number;
};

export type Genre = NonNullable<
  z.infer<typeof genreMovieListResponse>["genres"]
>[number];

export type MovieDetails = z.infer<typeof movieDetailsResponse>;

export type MovieVideos = z.infer<typeof movieVideosResponse>;

// Derive TvShowSort type from the generated Zod schema
export type TvShowSort = z.infer<typeof discoverTvQueryParams>["sort_by"];

export type TvShowDetails = z.infer<typeof tvSeriesDetailsResponse>;

export type TvShowVideos = z.infer<typeof tvSeriesVideosResponse>;
