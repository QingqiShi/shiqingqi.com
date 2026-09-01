import type { DailyExportEntry } from "./types.ts";

export function filterExports(
  entries: DailyExportEntry[],
  minPopularity: number,
): DailyExportEntry[] {
  return entries.filter((e) => !e.adult && e.popularity >= minPopularity);
}
