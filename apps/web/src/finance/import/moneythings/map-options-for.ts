import { addDays } from "../../domain/dates/add-days.ts";
import { DEFAULT_HOUSEHOLD_TIME_ZONE } from "../../domain/dates/default-household-time-zone.ts";
import { todayInTimeZone } from "../../domain/dates/today-in-time-zone.ts";
import { importId } from "./import-id.ts";
import type { MapOptions, SourceData } from "./types.ts";

const EXPECTED_WINDOW_DAYS = 60;

/** Options with deterministic ids derived from the backup's scene. */
export function mapOptionsFor(
  source: SourceData,
  overrides: Partial<MapOptions> = {},
): MapOptions {
  const timeZone = overrides.timeZone ?? DEFAULT_HOUSEHOLD_TIME_ZONE;
  const importedAt = new Date(source.manifest.createdAt);
  const importDate =
    overrides.importDate ?? todayInTimeZone(timeZone, importedAt);
  return {
    householdId: importId("household", source.sceneId),
    memberIds: {
      husband: importId("member", source.sceneId, "husband"),
      wife: importId("member", source.sceneId, "wife"),
    },
    memberNames: { husband: "老公", wife: "老婆" },
    groupOverrides: {},
    baseCurrency: "GBP",
    importedAt,
    expectedUntil: addDays(importDate, EXPECTED_WINDOW_DAYS),
    ...overrides,
    timeZone,
    importDate,
  };
}
