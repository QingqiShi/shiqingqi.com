import type { paths } from "@/_generated/tmdbV3";

export type Configuration =
  paths["/3/configuration"]["get"]["responses"]["200"]["content"]["application/json"];

export type MediaListItem = {
  id: number;
  title?: string;
  posterPath?: string;
  rating?: number;
};

export type MovieListItem = MediaListItem;

export type Genre = NonNullable<
  paths["/3/genre/movie/list"]["get"]["responses"]["200"]["content"]["application/json"]["genres"]
>[number];

export type MovieDetails = NonNullable<
  paths["/3/movie/{movie_id}"]["get"]["responses"]["200"]["content"]["application/json"]
>;

export type MovieVideos = NonNullable<
  paths["/3/movie/{movie_id}/videos"]["get"]["responses"]["200"]["content"]["application/json"]
>;

export type TvShowListItem = MediaListItem;

export type TvShowSort =
  | "first_air_date.asc"
  | "first_air_date.desc"
  | "name.asc"
  | "name.desc"
  | "original_name.asc"
  | "original_name.desc"
  | "popularity.asc"
  | "popularity.desc"
  | "vote_average.asc"
  | "vote_average.desc"
  | "vote_count.asc"
  | "vote_count.desc";

export type TvShowDetails = NonNullable<
  paths["/3/tv/{series_id}"]["get"]["responses"]["200"]["content"]["application/json"]
>;

export type TvShowVideos = NonNullable<
  paths["/3/tv/{series_id}/videos"]["get"]["responses"]["200"]["content"]["application/json"]
>;
