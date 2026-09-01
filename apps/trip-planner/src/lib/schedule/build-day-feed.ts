import { parseTimeToMinutes } from "./parse-time-to-minutes";
import type {
  Checklist,
  Day,
  Flight,
  MapPlace,
  NavLeg,
  Restaurant,
  SignSheet,
  TimelineItem,
  Tip,
} from "@/data/types";

/** One time-slot of a day, gathering everything that happens around it. */
export interface DayMoment {
  time: string;
  minutes: number;
  events: TimelineItem[];
  nav: NavLeg[];
  tips: Tip[];
  dining: Restaurant[];
  places: MapPlace[];
  checklists: Checklist[];
  signSheets: SignSheet[];
  flights: Flight[];
}

/**
 * Weave a day's parallel arrays into one chronological feed. Every timeline
 * step seeds a moment; nav legs, tips, dining, places and checklists that
 * carry a `time` slot into the matching moment (creating travel-only moments
 * where no timeline step shares the time). Moments are returned in time order.
 *
 * Items without a `time` are intentionally left out here — they are surfaced
 * separately (day-wide tips, fallback option lists) so nothing is dropped.
 */
export function buildDayFeed(day: Day): DayMoment[] {
  const moments = new Map<string, DayMoment>();
  const at = (time: string) => {
    const existing = moments.get(time);
    if (existing) return existing;
    const created: DayMoment = {
      time,
      minutes: parseTimeToMinutes(time),
      events: [],
      nav: [],
      tips: [],
      dining: [],
      places: [],
      checklists: [],
      signSheets: [],
      flights: [],
    };
    moments.set(time, created);
    return created;
  };

  // Timeline first so event-bearing moments keep priority on ties.
  for (const event of day.timeline) at(event.time).events.push(event);
  for (const flight of day.flights ?? [])
    if (flight.time) at(flight.time).flights.push(flight);
  for (const leg of day.nav ?? []) if (leg.time) at(leg.time).nav.push(leg);
  for (const tip of day.tips ?? []) if (tip.time) at(tip.time).tips.push(tip);
  for (const r of day.restaurants) if (r.time) at(r.time).dining.push(r);
  for (const place of day.places)
    if (place.time) at(place.time).places.push(place);
  for (const list of day.checklists ?? [])
    if (list.time) at(list.time).checklists.push(list);
  for (const sheet of day.signSheets ?? [])
    if (sheet.time) at(sheet.time).signSheets.push(sheet);

  return [...moments.values()].sort((a, b) => a.minutes - b.minutes);
}
