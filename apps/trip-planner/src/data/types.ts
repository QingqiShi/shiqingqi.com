/**
 * Shared shapes for every trip the planner can render.
 *
 * Trip content itself lives in `./trips/*` — one module per trip, all
 * hard-coded, read-only Chinese copy. Locations carry a Google Maps search
 * `query`; restaurants and lodgings add websites/booking details where known.
 */

/** A place worth visiting on a given day. `query` opens Google Maps. */
export interface MapPlace {
  name: string;
  query: string;
  note?: string;
  /** When this place fits the day, used to weave it into the chronological
   *  feed (e.g. the free-roam window). Omit to keep it as a day-level idea. */
  time?: string;
}

/** A confirmed booking attached to a restaurant. */
export interface Booking {
  date?: string;
  time?: string;
  party?: string;
  by?: string;
  contact?: string;
  note?: string;
}

export interface Restaurant {
  name: string;
  query: string;
  /** Short location label, e.g. "伯明翰" or "湖区 · Cartmel". */
  area?: string;
  tag: string;
  description: string;
  price?: string;
  website?: string;
  /** Direct menu link, when a stable one exists. */
  menu?: string;
  /** Michelin stars, when starred. */
  michelin?: 1 | 2 | 3;
  /** "booked" = confirmed reservation, "pick" = the planned choice. */
  status?: "booked" | "pick";
  booking?: Booking;
  /** The meal slot this option belongs to (e.g. "13:00" lunch, "19:00"
   *  dinner), used to weave dining into the chronological feed at the right
   *  time. Omit to keep it as a day-level option. */
  time?: string;
}

export interface Lodging {
  name: string;
  query?: string;
  address?: string;
  phone?: string;
  checkIn?: string;
  checkOut?: string;
  room?: string;
  note?: string;
  status: "booked" | "option" | "pending";
  recommended?: boolean;
}

export interface Stay {
  /** One-line summary for the overview list. */
  summary: string;
  /** Lodgings for this night. Empty when `ref` points at an earlier night. */
  lodging: Lodging[];
  /** Same bed as an earlier day (consecutive nights). */
  ref?: { dayN: number; label: string };
  note?: string;
  bookingUrl?: string;
}

export interface TimelineItem {
  time: string;
  text: string;
}

export interface Weather {
  /** Hand-authored temperature range, the fallback when no live forecast exists. */
  temp: string;
  /** Hand-authored condition + advice, the fallback when no live forecast exists. */
  summary: string;
  /** Advice kept alongside the live condition (e.g. "注意倒时差"). Omit when
   *  `summary` is purely a condition with no extra guidance worth preserving. */
  note?: string;
}

/** A geographic point, used to fetch live weather for a day. */
export interface Coords {
  lat: number;
  lon: number;
}

/** How a navigation deep-link should route. */
export type TravelMode = "driving" | "transit" | "walking";

/**
 * A navigable leg. Opens Google Maps *directions* with the route preloaded.
 * `from` omitted = start from the device's current location.
 */
export interface NavLeg {
  label: string;
  /** Destination search query. */
  to: string;
  /** Origin search query; omit to use current location. */
  from?: string;
  mode?: TravelMode;
  note?: string;
  /** Departure time for this hop, used to slot the leg into the day's
   *  chronological feed at the moment you set off. */
  time?: string;
}

/** A tick-through checklist (e.g. 入境流程, 还车检查). State lives client-side. */
export interface Checklist {
  title: string;
  items: string[];
  note?: string;
  /** When to work through this list (e.g. arrival, checkout), used to place it
   *  in the chronological feed. Omit to keep it day-level. */
  time?: string;
}

/** Which road-sign pictograph to draw — keys into the SVG set in
 *  `components/trip/road-signs.tsx`. */
export type RoadSignGlyph =
  | "roadColors"
  | "noEntry"
  | "oneWay"
  | "giveWay"
  | "priority"
  | "noParking"
  | "ztl"
  | "speedLimit"
  | "speedCamera";

/** One road sign in a crib sheet: the drawn glyph plus what it means. */
export interface RoadSign {
  glyph: RoadSignGlyph;
  name: string;
  meaning: string;
}

/** A crib sheet of road signs, rendered as real sign pictographs. */
export interface SignSheet {
  title: string;
  signs: RoadSign[];
  note?: string;
  /** When to review the sheet, used to weave it into the chronological feed. */
  time?: string;
}

/** What kind of fixed commitment an anchor is — drives its icon. */
export type AnchorKind =
  | "flight"
  | "pickup"
  | "dropoff"
  | "checkin"
  | "checkout"
  | "reservation"
  | "transit"
  | "drive";

/** One "must-be-there" moment for the day's at-a-glance summary. */
export interface Anchor {
  time?: string;
  label: string;
  kind: AnchorKind;
  /** When set, renders a 导航 button to this destination. */
  query?: string;
  mode?: TravelMode;
}

/** What kind of practical heads-up a tip is — drives its icon. */
export type TipKind =
  | "parking"
  | "fuel"
  | "drive"
  | "transit"
  | "money"
  | "warn"
  | "info";

/** A practical heads-up for the day (parking, fuel, driving rules…). */
export interface Tip {
  kind: TipKind;
  text: string;
  /** When this heads-up is relevant, used to weave it into the feed next to
   *  the moment it serves. Omit for day-wide notes (shown in 今日须知). */
  time?: string;
}

export interface Day {
  n: number;
  /** ISO date, e.g. "2026-06-19". */
  date: string;
  dateLabel: string;
  weekday: string;
  title: string;
  route: string;
  driving?: string;
  weather?: Weather;
  /** Representative point (overnight base or the day's main locus) for fetching
   *  the day's live weather. Omit on days with no weather slot. */
  coords?: Coords;
  /** Fixed commitments surfaced in the at-a-glance card. */
  anchors?: Anchor[];
  /** One-tap navigation legs for the day. */
  nav?: NavLeg[];
  timeline: TimelineItem[];
  /** Tick-through checklists (入境、退房收拾、还车…). */
  checklists?: Checklist[];
  /** Road-sign crib sheets (e.g. 意大利路牌速记), drawn as pictographs. */
  signSheets?: SignSheet[];
  places: MapPlace[];
  restaurants: Restaurant[];
  /** Practical heads-ups (parking, fuel, driving rules). */
  tips?: Tip[];
  stay: Stay;
}

/**
 * How a person relates to a single day:
 *  - `arrive` / `depart` — joins / leaves the group that day
 *  - `home` — a locally based host heads home rather than travelling on
 *  - `present` — around that day, no transition
 */
export type PresenceKind = "arrive" | "depart" | "home" | "present";

/** How a guest travels in and out — drives which arrive/depart glyph shows:
 *  `air` flies (plane), `ground` drives or takes the train (person). */
export type TravelVia = "air" | "ground";

/** One person's involvement in a single day. */
export interface DayPresence {
  id: string;
  name: string;
  /** Single glyph shown inside the avatar medallion (e.g. 石, 大, J, E). */
  initial: string;
  kind: PresenceKind;
  via: TravelVia;
}

/** One person's involvement across the whole trip — the source the per-day
 *  presence chips are derived from. */
export interface PersonSchedule {
  id: string;
  name: string;
  /** Single glyph for the avatar medallion. */
  initial: string;
  /** First and last trip day (inclusive) the person is involved. */
  range: [number, number];
  /** How the person travels in and out; defaults to `air`. */
  via?: TravelVia;
  /** Days inside the range when the person is away (not involved). */
  away?: number[];
  /** Transition markers for specific days; unlisted in-range days are `present`. */
  markers?: Partial<Record<number, "arrive" | "depart" | "home">>;
}

export interface Trip {
  /** URL segment the trip lives under (`/gb`), also the password-gate scope
   *  in `src/proxy.ts` and the checklist localStorage namespace. */
  slug: string;
  title: string;
  subtitle: string;
  dateRange: string;
  party: string;
  /** Who is on the trip and when, driving the per-day presence chips. */
  partySchedule: PersonSchedule[];
  days: Day[];
}

export type TripPhase = "before" | "during" | "after";

export interface ResolvedDay {
  index: number;
  phase: TripPhase;
  /** Whole days until the trip starts (only meaningful when phase is "before"). */
  daysUntil: number;
}
