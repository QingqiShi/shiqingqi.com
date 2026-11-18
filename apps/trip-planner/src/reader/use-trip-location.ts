"use client";

import { useSyncExternalStore } from "react";

/** What the trip page shows: one day, or the calendar of every day. */
export type TripLocation = { view: "day"; day: number } | { view: "calendar" };

// The hash holds the place, not the path: the whole trip is one page, so the
// service worker keeps one copy of it, and every day reads offline after one
// visit. A path per day would need each day stored on its own.
const DAY_HASH = /^#day-(\d+)$/;
const CALENDAR_HASH = "#calendar";
// The name of the calendar before it was one. Old links still open it.
const OVERVIEW_HASH = "#overview";

const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  window.addEventListener("hashchange", listener);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("hashchange", listener);
  };
}

function getSnapshot() {
  return window.location.hash;
}

function getServerSnapshot() {
  return "";
}

function parse(
  hash: string,
  dayCount: number,
  fallbackDay: number,
): TripLocation {
  if (hash === CALENDAR_HASH || hash === OVERVIEW_HASH) {
    return { view: "calendar" };
  }
  const day = Number(DAY_HASH.exec(hash)?.[1] ?? Number.NaN);
  if (Number.isInteger(day) && day >= 0) {
    // A day that the trip no longer has, such as one that the person added
    // and took back, shows the last day.
    return { view: "day", day: Math.min(day, dayCount - 1) };
  }
  return { view: "day", day: fallbackDay };
}

export function tripLocationHash(location: TripLocation) {
  return location.view === "calendar"
    ? CALENDAR_HASH
    : `#day-${String(location.day)}`;
}

/** Puts a place in the URL hash, in the current history entry. */
function replaceTripLocation(next: TripLocation) {
  // Do not give the current state here. Next.js ignores a state that it
  // wrote, and then the next `router.refresh()` writes the URL without the
  // hash, which removes the day from the URL.
  window.history.replaceState(null, "", tripLocationHash(next));
  for (const listener of listeners) listener();
}

/**
 * The place on the trip page that the URL hash names, and a way to move. A
 * page with no hash shows `fallbackDay`, such as today. A move replaces the
 * history entry, so that Back leaves the trip, not the last day.
 */
export function useTripLocation(dayCount: number, fallbackDay: number) {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const location = parse(hash, dayCount, fallbackDay);
  return [location, replaceTripLocation] as const;
}
