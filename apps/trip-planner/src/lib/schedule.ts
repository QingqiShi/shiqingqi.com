import type {
  AnchorKind,
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
  signSheets: SignSheet[];
  flights: Flight[];
  /** Everything here is a "nice to have" — no protected backbone item, no fixed
   *  commitment. These collapse out of the current day's feed when the live
   *  time-budget says they no longer fit. */
  optional: boolean;
  /** A fixed commitment whose time is sacred (a booked table, a flight, a boat,
   *  a checkout deadline). The time-budget never lets an optional stop push past
   *  one of these. */
  hard: boolean;
  /** Rough minutes this moment occupies — an optional stop's dwell, or a drive
   *  leg's travel time — fed to the time-budget. */
  durationMin: number;
}

/** Anchor kinds with a sacred clock time: miss them and the day breaks. A
 *  `checkin` is flexible (arrive whenever) and a `drive` is just a waypoint, so
 *  neither bounds the budget. */
const HARD_ANCHOR_KINDS = new Set<AnchorKind>([
  "flight",
  "pickup",
  "dropoff",
  "reservation",
  "transit",
  "checkout",
]);

/** Default dwell for an optional stop that doesn't state its own. */
const DEFAULT_OPTIONAL_MINUTES = 30;

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
      optional: false,
      hard: false,
      durationMin: 0,
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

  const hardAnchorTimes = new Set(
    (day.anchors ?? [])
      .filter((anchor) => anchor.time && HARD_ANCHOR_KINDS.has(anchor.kind))
      .map((anchor) => anchor.time),
  );
  for (const moment of moments.values())
    classifyMoment(moment, hardAnchorTimes.has(moment.time));

  return [...moments.values()].sort((a, b) => a.minutes - b.minutes);
}

/** Fill in a moment's `optional` / `hard` / `durationMin` from its contents.
 *  A moment is optional only when it carries content and every piece of it is
 *  flagged optional (and nothing fixed — a booked table, a flight, a checklist —
 *  sits in it). A booked restaurant, a flight, or a hard anchor time makes it a
 *  sacred deadline. */
function classifyMoment(moment: DayMoment, onHardAnchor: boolean): void {
  const bookedTable = moment.dining.some((r) => r.status === "booked");
  const hasFlight = moment.flights.length > 0;
  const hasChecklist = moment.checklists.length > 0;

  const pieces = [
    ...moment.events,
    ...moment.nav,
    ...moment.tips,
    ...moment.dining,
    ...moment.places,
  ];
  const everyPieceOptional =
    pieces.length > 0 &&
    pieces.every((piece) => "optional" in piece && piece.optional === true);

  moment.hard = onHardAnchor || bookedTable || hasFlight;
  moment.optional =
    everyPieceOptional &&
    !moment.hard &&
    !hasFlight &&
    !hasChecklist &&
    !bookedTable;

  const stated = pieces.reduce((max, piece) => {
    const value = "durationMin" in piece ? piece.durationMin : undefined;
    return typeof value === "number" && value > max ? value : max;
  }, 0);
  moment.durationMin =
    stated > 0 ? stated : moment.optional ? DEFAULT_OPTIONAL_MINUTES : 0;
}

/** Why an optional moment left today's feed: `passed` = the clock moved on past
 *  it; `unfit` = it can't be done in time before the next fixed commitment. */
export type DropReason = "passed" | "unfit";

/**
 * Decide which optional moments to drop from *today's* feed given the live
 * clock, walking the day forward and spending time as it goes.
 *
 * The rule mirrors how you'd actually triage a slipping day: protected
 * backbone (travel, check-in/out, booked tables) always stays; an optional stop
 * survives only while there's still room to do it *and* reach the next sacred
 * deadline on time. Stops already overtaken by the clock fall away too — except
 * the one you're in the middle of, which is never yanked out from under you.
 *
 * Returns a map of dropped moment `time` → why. Pure: no clock reads inside.
 */
export function planToday(
  moments: DayMoment[],
  nowMinutes: number,
): Map<string, DropReason> {
  const dropped = new Map<string, DropReason>();
  if (moments.length === 0) return dropped;

  // The moment you're currently in: the last one whose time has arrived.
  let currentIndex = -1;
  for (const [i, moment] of moments.entries())
    if (moment.minutes <= nowMinutes) currentIndex = i;

  // Travel time that must still be spent between moment `i` and the deadline at
  // `capIndex`, so an optional stop can't quietly eat the drive to the table.
  const reservedDriveBetween = (i: number, capIndex: number) => {
    let total = 0;
    for (let j = i + 1; j < capIndex; j++)
      if (!moments[j].optional) total += moments[j].durationMin;
    return total;
  };

  let cursor = nowMinutes;
  for (let i = 0; i < moments.length; i++) {
    const moment = moments[i];

    if (!moment.optional) {
      // Backbone: reach it no earlier than its time, then spend its duration —
      // but only for the leg you're on or haven't reached. Time on legs already
      // behind you is spent; it's baked into `now`, so re-adding it would stack
      // the drive on top of the clock.
      const spend = i >= currentIndex ? moment.durationMin : 0;
      cursor = Math.max(cursor, moment.minutes) + spend;
      continue;
    }

    if (i < currentIndex) {
      // Overtaken by a later, already-started moment — the window has closed.
      dropped.set(moment.time, "passed");
      continue;
    }
    if (i === currentIndex) {
      // In progress right now — keep it, and account for its time.
      cursor = Math.max(cursor, moment.minutes + moment.durationMin);
      continue;
    }

    // Still ahead: does it fit before the next sacred deadline?
    let capIndex = moments.length;
    let cap = Number.MAX_SAFE_INTEGER;
    for (let j = i + 1; j < moments.length; j++)
      if (moments[j].hard) {
        capIndex = j;
        cap = moments[j].minutes;
        break;
      }

    const start = Math.max(cursor, moment.minutes);
    const finish =
      start + moment.durationMin + reservedDriveBetween(i, capIndex);
    if (finish <= cap) {
      cursor = start + moment.durationMin;
    } else {
      dropped.set(moment.time, "unfit");
    }
  }

  return dropped;
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
