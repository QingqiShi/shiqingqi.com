import type {
  Checklist,
  Day,
  MapPlace,
  NavLeg,
  Restaurant,
  TimelineItem,
  Tip,
} from "@/data/itinerary";

/**
 * Coarse times-of-day, in minutes past midnight, so word-labels sort alongside
 * concrete "HH:MM" times. "备选" (an optional alternative, not a real time)
 * sorts to the very end.
 */
const WORD_MINUTES: Record<string, number> = {
  凌晨: 4 * 60,
  清晨: 5 * 60 + 30,
  一早: 6 * 60,
  清早: 6 * 60,
  早上: 7 * 60,
  早晨: 7 * 60,
  上午: 9 * 60,
  白天: 10 * 60,
  中午: 12 * 60,
  午后: 13 * 60 + 30,
  下午: 14 * 60,
  傍晚: 18 * 60,
  黄昏: 18 * 60 + 30,
  入夜: 19 * 60 + 30,
  晚上: 20 * 60,
  夜里: 22 * 60,
  深夜: 23 * 60,
  备选: 30 * 60,
};

const NUMERIC_TIME = /^(\d{1,2}):(\d{2})$/;

/**
 * Turn a schedule label into minutes past midnight for ordering. Concrete
 * "HH:MM" times parse directly; coarse words map to a representative time;
 * anything unrecognised sorts last (kept stable by the caller's sort).
 */
export function parseTimeToMinutes(time: string): number {
  const match = NUMERIC_TIME.exec(time.trim());
  if (match) return Number(match[1]) * 60 + Number(match[2]);
  return WORD_MINUTES[time.trim()] ?? Number.MAX_SAFE_INTEGER;
}

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
    };
    moments.set(time, created);
    return created;
  };

  // Timeline first so event-bearing moments keep priority on ties.
  for (const event of day.timeline) at(event.time).events.push(event);
  for (const leg of day.nav ?? []) if (leg.time) at(leg.time).nav.push(leg);
  for (const tip of day.tips ?? []) if (tip.time) at(tip.time).tips.push(tip);
  for (const r of day.restaurants) if (r.time) at(r.time).dining.push(r);
  for (const place of day.places)
    if (place.time) at(place.time).places.push(place);
  for (const list of day.checklists ?? [])
    if (list.time) at(list.time).checklists.push(list);

  return [...moments.values()].sort((a, b) => a.minutes - b.minutes);
}

/** A stable DOM id for a moment, shared by the feed (sets it) and the glance
 *  card / auto-scroll (target it). */
export function momentDomId(dayN: number, time: string): string {
  return `d${String(dayN)}-moment-${String(parseTimeToMinutes(time))}`;
}

/** Tips with no `time`: general, all-day heads-ups shown in 今日须知. */
export function dayWideTips(day: Day): Tip[] {
  return (day.tips ?? []).filter((tip) => !tip.time);
}

/** Dining options not pinned to a meal slot — a safety net so none vanish. */
export function untimedDining(day: Day): Restaurant[] {
  return day.restaurants.filter((restaurant) => !restaurant.time);
}

/** Place ideas not pinned to a window — a safety net so none vanish. */
export function untimedPlaces(day: Day): MapPlace[] {
  return day.places.filter((place) => !place.time);
}
