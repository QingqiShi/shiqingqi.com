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
  /** Every piece here is a "nice to have" and nothing fixed sits in it — the
   *  user can toggle the whole moment off near "now" to reclaim its time. */
  optional: boolean;
  /** A fixed commitment whose time is sacred (a booked table, a flight, a hard
   *  anchor like a checkout deadline). Never offered as droppable. */
  hard: boolean;
  /** Rough minutes this moment occupies — for an optional stop, the time
   *  reclaimed by dropping it. Feeds the planner's "saved" estimate. */
  durationMin: number;
}

/** Anchor kinds with a sacred clock time: miss them and the day breaks. A
 *  `checkin` is flexible (arrive whenever) and a `drive` is just a waypoint, so
 *  neither bounds the plan. */
const HARD_ANCHOR_KINDS = new Set<AnchorKind>([
  "flight",
  "pickup",
  "dropoff",
  "reservation",
  "transit",
  "checkout",
]);

/** Minutes assumed reclaimed by an optional stop that states no `durationMin`. */
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

/** Fill in a moment's `optional` / `hard` / `durationMin` from its contents. A
 *  moment is optional only when it carries content and *every* piece of it is
 *  flagged optional — and nothing fixed (a booked table, a flight, a checklist,
 *  a sign sheet, a hard anchor time) sits in it. Those make it a sacred
 *  commitment instead. */
function classifyMoment(moment: DayMoment, onHardAnchor: boolean): void {
  const bookedTable = moment.dining.some((r) => r.status === "booked");
  const hasFlight = moment.flights.length > 0;
  const hasChecklist = moment.checklists.length > 0;
  const hasSignSheet = moment.signSheets.length > 0;

  const pieces = [
    ...moment.events,
    ...moment.nav,
    ...moment.tips,
    ...moment.dining,
    ...moment.places,
  ];
  const everyPieceOptional =
    pieces.length > 0 && pieces.every((piece) => piece.optional === true);

  moment.hard = onHardAnchor || bookedTable || hasFlight;
  moment.optional =
    everyPieceOptional && !moment.hard && !hasChecklist && !hasSignSheet;

  const stated = pieces.reduce((max, piece) => {
    const value = "durationMin" in piece ? piece.durationMin : undefined;
    return typeof value === "number" && value > max ? value : max;
  }, 0);
  moment.durationMin =
    stated > 0 ? stated : moment.optional ? DEFAULT_OPTIONAL_MINUTES : 0;
}

/** A short name for a moment — its lead place, meal, step or leg — used by the
 *  planner toggles and the "skipped" reroute note. */
export function momentLabel(moment: DayMoment): string {
  if (moment.places.length > 0) return moment.places[0].name;
  if (moment.dining.length > 0) return moment.dining[0].name;
  if (moment.events.length > 0) return moment.events[0].text;
  if (moment.nav.length > 0) return moment.nav[0].label;
  return moment.time;
}

/** The optional moments of a day, in time order — the stops the planner can
 *  offer to drop. Pass `fromMinutes` to keep only those still ahead of "now",
 *  since the planner edits the *future* of the day. */
export function optionalMoments(
  moments: DayMoment[],
  fromMinutes?: number,
): DayMoment[] {
  return moments.filter(
    (moment) =>
      moment.optional &&
      (fromMinutes === undefined || moment.minutes >= fromMinutes),
  );
}

/** A nav leg as rendered in the feed: the authored leg, plus the names of any
 *  optional stops dropped just before it, when the route was re-stitched to
 *  start from where those stops' drive began. */
export interface FeedNavLeg extends NavLeg {
  skipped?: string[];
}

/** A moment as it appears once the user's drops are applied: the (possibly
 *  re-routed) moment, plus any optional stops collapsed away right before it. */
export interface PlannedMoment {
  moment: Omit<DayMoment, "nav"> & { nav: FeedNavLeg[] };
  /** Names of optional stops dropped immediately before this moment, attached
   *  to its re-routed drive so the change reads honestly. */
  skippedBefore: string[];
}

/** The day's feed with the user's dropped optionals removed. */
export interface DayPlan {
  /** Visible moments in time order, with navigation re-stitched around drops. */
  rows: PlannedMoment[];
  /** Minutes reclaimed by the current drops — the headline "saved" estimate. */
  savedMinutes: number;
  /** Names of every dropped stop, for the summary line. */
  droppedLabels: string[];
}

/** Is this leg a drive (the default mode) we can re-stitch a route through? */
function isDrivingLeg(leg: NavLeg): boolean {
  return (leg.mode ?? "driving") === "driving";
}

/**
 * Remove the user-dropped optional moments from a day's feed and re-stitch the
 * drive around them: a dropped stop takes its inbound detour with it, and the
 * next kept drive picks up from where that detour began — so the route stays
 * honest (origin → next kept stop) instead of routing through a place you
 * skipped. Backbone moments are never dropped, even if their `time` is in the
 * set, so a stale entry can't strand a must-do.
 *
 * Pure: `dropped` is a set of moment `time`s (each unique within a day).
 */
export function applyDrops(
  moments: DayMoment[],
  dropped: ReadonlySet<string>,
): DayPlan {
  const rows: PlannedMoment[] = [];
  const droppedLabels: string[] = [];
  let savedMinutes = 0;

  // Carried across a run of drops: where the skipped detour set off from, and
  // the names of the stops skipped, to re-point and annotate the next drive.
  let carryFrom: string | undefined;
  let carrySkipped: string[] = [];

  for (const moment of moments) {
    if (moment.optional && dropped.has(moment.time)) {
      savedMinutes += moment.durationMin;
      droppedLabels.push(momentLabel(moment));
      carrySkipped.push(momentLabel(moment));
      const detour = moment.nav.find((leg) => isDrivingLeg(leg) && leg.from);
      if (carryFrom === undefined && detour?.from) carryFrom = detour.from;
      continue;
    }

    if (carryFrom !== undefined) {
      const idx = moment.nav.findIndex(isDrivingLeg);
      if (idx >= 0) {
        const nav: FeedNavLeg[] = moment.nav.map((leg, i) =>
          i === idx ? { ...leg, from: carryFrom, skipped: carrySkipped } : leg,
        );
        rows.push({
          moment: { ...moment, nav },
          skippedBefore: carrySkipped,
        });
        carryFrom = undefined;
        carrySkipped = [];
        continue;
      }
      // No drive here to graft onto yet — keep carrying to a later moment.
    }

    rows.push({ moment: { ...moment, nav: moment.nav }, skippedBefore: [] });
  }

  return { rows, savedMinutes, droppedLabels };
}

/** Format reclaimed minutes as concise Chinese, e.g. "1 小时 5 分钟" / "45 分钟". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0)
    return `${String(hours)} 小时 ${String(mins)} 分钟`;
  if (hours > 0) return `${String(hours)} 小时`;
  return `${String(mins)} 分钟`;
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
