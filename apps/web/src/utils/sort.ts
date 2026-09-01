export type Sort =
  | "popularity.asc"
  | "popularity.desc"
  | "vote_average.asc"
  | "vote_average.desc";

const sorts: ReadonlySet<string> = new Set<Sort>([
  "popularity.asc",
  "popularity.desc",
  "vote_average.asc",
  "vote_average.desc",
]);

export function isSort(value: unknown): value is Sort {
  return typeof value === "string" && sorts.has(value);
}
