"use client";

import { useSyncExternalStore } from "react";

/** What the trip page shows: one day, or the overview of every day. */
export type TripLocation = { view: "day"; day: number } | { view: "overview" };

// The hash holds the place, not the path: the whole trip is one page, so the
// service worker keeps one copy of it, and every day reads offline after one
// visit. A path per day would need each day stored on its own.
const DAY_HASH = /^#day-(\d+)$/;
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
  if (hash === OVERVIEW_HASH) return { view: "overview" };
  const day = Number(DAY_HASH.exec(hash)?.[1] ?? Number.NaN);
  if (Number.isInteger(day) && day >= 0 && day < dayCount) {
    return { view: "day", day };
  }
  return { view: "day", day: fallbackDay };
}

export function tripLocationHash(location: TripLocation) {
  return location.view === "overview"
    ? OVERVIEW_HASH
    : `#day-${String(location.day)}`;
}

/**
 * The place on the trip page that the URL hash names, and a way to move. A
 * page with no hash shows `fallbackDay`, such as today. A move replaces the
 * history entry, so that Back leaves the trip, not the last day.
 */
export function useTripLocation(dayCount: number, fallbackDay: number) {
  const hash = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const location = parse(hash, dayCount, fallbackDay);

  const go = (next: TripLocation) => {
    window.history.replaceState(
      window.history.state,
      "",
      tripLocationHash(next),
    );
    for (const listener of listeners) listener();
  };

  return [location, go] as const;
}
