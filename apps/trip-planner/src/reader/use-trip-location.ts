"use client";

import { useLayoutEffect, useSyncExternalStore } from "react";

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
  if (Number.isInteger(day) && day >= 0 && day < dayCount) {
    return { view: "day", day };
  }
  return { view: "day", day: fallbackDay };
}

/** The id of the element of a day, which the hash names. */
export function dayAnchorId(day: number) {
  return `day-${String(day)}`;
}

export function tripLocationHash(location: TripLocation) {
  return location.view === "calendar"
    ? CALENDAR_HASH
    : `#${dayAnchorId(location.day)}`;
}

/** Puts a place in the URL hash, in the current history entry. */
export function replaceTripLocation(next: TripLocation) {
  window.history.replaceState(window.history.state, "", tripLocationHash(next));
  for (const listener of listeners) listener();
}

let arrival: { path: string; location: TripLocation } | null = null;

/**
 * Makes the trip page at `path` open at a place, the next time that it
 * shows. A step back in history shows the page at the hash that it had, so
 * the screen that the person leaves names the place this way.
 */
export function arriveAt(path: string, location: TripLocation) {
  arrival = { path, location };
}

/** The URL hash, which names a place on the trip page. Empty on the server. */
export function useTripHash() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/**
 * The place on the trip page that the URL hash names, and a way to move. A
 * page with no hash shows `fallbackDay`, such as today. A move replaces the
 * history entry, so that Back leaves the trip, not the last day. The page
 * opens at the place that `arriveAt` named for it.
 */
export function useTripLocation(dayCount: number, fallbackDay: number) {
  useLayoutEffect(() => {
    if (arrival?.path === window.location.pathname) {
      replaceTripLocation(arrival.location);
    }
    arrival = null;
  }, []);
  const location = parse(useTripHash(), dayCount, fallbackDay);
  return [location, replaceTripLocation] as const;
}
