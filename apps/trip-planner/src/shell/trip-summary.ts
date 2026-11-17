import type { SupportedLocale } from "@tuja/i18n/types";
import { shortRangeLabel } from "#src/reader/date-label.ts";
import { resolveDay } from "#src/reader/resolve-day.ts";
import type { Trip, TripPhase } from "#src/trips/types.ts";

/** What the trip list shows of a trip. It is public, so it holds no more than a title and dates. */
export interface TripSummary {
  /** The id of the trip, which is its path. */
  id: string;
  title: string;
  language: Trip["language"];
  dates: string;
  phase: TripPhase;
  /** The day of the trip that is today, while the trip is on. */
  dayIndex: number;
  firstDayNumber: Trip["firstDayNumber"];
}

export function tripSummary(
  id: string,
  trip: Trip,
  now: Date,
  locale: SupportedLocale,
): TripSummary {
  const { index, phase } = resolveDay(now, trip.days, trip.timeZone);
  return {
    id,
    title: trip.title,
    language: trip.language,
    dates: shortRangeLabel(trip.days, locale),
    phase,
    dayIndex: index,
    firstDayNumber: trip.firstDayNumber,
  };
}
