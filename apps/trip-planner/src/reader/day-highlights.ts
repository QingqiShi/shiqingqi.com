import { momentMinutes, momentTimeLabel } from "./day-feed/moment-time-label";
import type { Day, Highlight } from "@/trips/types";

export interface DayHighlight extends Highlight {
  momentId: string;
  time: string;
  /** The moment also shows in the feed, so the card can jump to it. */
  inFeed: boolean;
}

/** The day's fixed commitments, in time order, for the at-a-glance card. */
export function dayHighlights(day: Day): DayHighlight[] {
  return day.moments
    .flatMap((moment) =>
      moment.highlight
        ? [
            {
              ...moment.highlight,
              momentId: moment.id,
              time: momentTimeLabel(moment.time),
              minutes: momentMinutes(moment.time),
              inFeed: moment.text !== undefined || moment.items.length > 0,
            },
          ]
        : [],
    )
    .sort((a, b) => a.minutes - b.minutes)
    .map(({ minutes: _minutes, ...highlight }) => highlight);
}
