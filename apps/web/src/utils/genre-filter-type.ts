export type GenreFilterType = "all" | "any";

const genreFilterTypes: ReadonlySet<string> = new Set<GenreFilterType>([
  "all",
  "any",
]);

export function isGenreFilterType(value: unknown): value is GenreFilterType {
  return typeof value === "string" && genreFilterTypes.has(value);
}
