import type { DraftOp } from "#src/trips/ops/apply-ops.ts";
import type { Trip } from "#src/trips/types.ts";

/** The details of a trip as a person types them. */
export interface TripDetails {
  title: string;
  subtitle: string;
  party: string;
  firstDate: string;
  timeZone: string;
}

export function tripDetailsOf(trip: Trip): TripDetails {
  return {
    title: trip.title,
    subtitle: trip.subtitle ?? "",
    party: trip.party ?? "",
    firstDate: trip.days[0].date,
    timeZone: trip.timeZone,
  };
}

/**
 * The ops for what the person changed in a form that opened with the
 * details `opened`: a detail that they did not touch is not sent, so that
 * it cannot write over a change that someone else made meanwhile. A line
 * that is empty takes the line away. The title and the first day must not
 * be empty.
 */
export function tripDetailsOps(
  opened: TripDetails,
  details: TripDetails,
): DraftOp[] {
  const title = details.title.trim();
  const subtitle = details.subtitle.trim();
  const party = details.party.trim();
  const fields = {
    ...(title !== opened.title.trim() ? { title } : {}),
    ...(subtitle !== opened.subtitle.trim()
      ? { subtitle: subtitle || null }
      : {}),
    ...(party !== opened.party.trim() ? { party: party || null } : {}),
    ...(details.timeZone !== opened.timeZone
      ? { timeZone: details.timeZone }
      : {}),
  };
  return [
    ...(Object.keys(fields).length > 0
      ? [{ op: "setTrip" as const, fields }]
      : []),
    ...(details.firstDate !== opened.firstDate
      ? [{ op: "setFirstDate" as const, date: details.firstDate }]
      : []),
  ];
}
