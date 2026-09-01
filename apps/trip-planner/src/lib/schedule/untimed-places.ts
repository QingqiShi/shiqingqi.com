import type { Day, MapPlace } from "@/data/types";

/** Place ideas not pinned to a window — a safety net so none vanish. */
export function untimedPlaces(day: Day): MapPlace[] {
  return day.places.filter((place) => !place.time);
}
