import { useEffect, useRef } from "react";
import type { Trip } from "#src/trips/types.ts";
import { buildDayFeed, type DayMoment } from "./day-feed/build-day-feed.ts";
import { momentDomId } from "./day-feed/moment-dom-id.ts";
import { minutesInZone } from "./resolve-day.ts";
import { takeArrived, tripLocationHash } from "./use-trip-location.ts";

const MOBILE_QUERY = "(max-width: 47.99rem)";

/** Index of the moment that's "now" — the last one already started. */
function currentMomentIndex(moments: DayMoment[], nowMinutes: number) {
  let index = 0;
  for (const [i, moment] of moments.entries()) {
    if (moment.minutes <= nowMinutes) index = i;
  }
  return index;
}

/**
 * On a phone, scrolls once to the moment of today that is now, when the page
 * opens at today and no other screen named the place to open at.
 */
export function useScrollToNow(trip: Trip, todayIndex: number) {
  const doneRef = useRef(false);
  useEffect(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    // A person who comes from the editor lands where the editor says.
    if (takeArrived()) return;
    const day = trip.days.at(todayIndex);
    if (todayIndex < 0 || !day) return;
    // The first render of the page does not know the hash yet. A page opened
    // at another day keeps its place.
    const { hash } = window.location;
    if (
      hash !== "" &&
      hash !== tripLocationHash({ view: "day", day: todayIndex })
    ) {
      return;
    }
    const moments = buildDayFeed(day);
    if (moments.length === 0) return;
    if (!window.matchMedia(MOBILE_QUERY).matches) return;

    const nowMinutes = minutesInZone(new Date(), trip.timeZone);
    const index = currentMomentIndex(moments, nowMinutes);
    document
      .getElementById(momentDomId(moments[index].id))
      ?.scrollIntoView({ block: "start" });
  }, [trip, todayIndex]);
}
