import { momentMinutes } from "./day-feed/moment-minutes.ts";
import type { Day, Highlight, MomentTime } from "@/trips/types";

export interface DayHighlight extends Highlight {
  momentId: string;
  time: MomentTime;
  /** The moment also shows in the feed, so the row can jump to it. */
  inFeed: boolean;
}

/** The day's fixed commitments, in time order, for the at-a-glance list. */
export function dayHighlights(day: Day): DayHighlight[] {
  return day.moments
    .flatMap((moment) =>
      moment.highlight
        ? [
            {
              ...moment.highlight,
              momentId: moment.id,
              time: moment.time,
              minutes: momentMinutes(moment.time),
              inFeed: moment.text !== undefined || moment.items.length > 0,
            },
          ]
        : [],
    )
    .sort((a, b) => a.minutes - b.minutes)
    .map(({ minutes: _minutes, ...highlight }) => highlight);
}
