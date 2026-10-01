import type { StoredPreference } from "./types";

export function makeId(
  category: StoredPreference["category"],
  value: string,
): string {
  return `${category}:${value.toLowerCase()}`;
}
