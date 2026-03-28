export type GenreFilterType = "all" | "any";
export type Sort =
  | "popularity.asc"
  | "popularity.desc"
  | "vote_average.asc"
  | "vote_average.desc";
export type MediaType = "movie" | "tv";

const genreFilterTypes: ReadonlySet<string> = new Set<GenreFilterType>([
  "all",
  "any",
]);
export function isGenreFilterType(value: unknown): value is GenreFilterType {
  return typeof value === "string" && genreFilterTypes.has(value);
}

const sorts: ReadonlySet<string> = new Set<Sort>([
  "popularity.asc",
  "popularity.desc",
  "vote_average.asc",
  "vote_average.desc",
]);
export function isSort(value: unknown): value is Sort {
  return typeof value === "string" && sorts.has(value);
}

const mediaTypes: ReadonlySet<string> = new Set<MediaType>(["movie", "tv"]);
export function isMediaType(value: unknown): value is MediaType {
  return typeof value === "string" && mediaTypes.has(value);
}
