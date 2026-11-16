import { useSyncExternalStore } from "react";
import { resolveDay } from "#src/reader/resolve-day.ts";
import type { ResolvedDay, Trip } from "#src/trips/types.ts";

function subscribe(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => {
    document.removeEventListener("visibilitychange", listener);
  };
}

function key({ index, phase, daysUntil }: ResolvedDay) {
  return `${phase}:${String(index)}:${String(daysUntil)}`;
}

function fromKey(value: string): ResolvedDay {
  const [phase, index, daysUntil] = value.split(":");
  return {
    phase: phase === "before" || phase === "after" ? phase : "during",
    index: Number(index),
    daysUntil: Number(daysUntil),
  };
}

/**
 * Where today falls on the trip, on the trip's clock. The server works it out
 * for the first paint. The reader's clock decides after that, because a page
 * that the service worker keeps can open offline days later.
 */
export function useTripToday(trip: Trip, server: ResolvedDay): ResolvedDay {
  const value = useSyncExternalStore(
    subscribe,
    () => key(resolveDay(new Date(), trip.days, trip.timeZone)),
    () => key(server),
  );
  return fromKey(value);
}
