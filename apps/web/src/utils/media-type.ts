export type MediaType = "movie" | "tv";

const mediaTypes: ReadonlySet<string> = new Set<MediaType>(["movie", "tv"]);

export function isMediaType(value: unknown): value is MediaType {
  return typeof value === "string" && mediaTypes.has(value);
}
