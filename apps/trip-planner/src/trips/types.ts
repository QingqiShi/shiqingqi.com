import type { z } from "zod";
import type { DAY_PARTS } from "./day-parts";
import type {
  booking,
  checklist,
  day,
  flight,
  flightEndpoint,
  highlight,
  lodging,
  moment,
  momentItemSchema,
  momentTimeSchema,
  navLeg,
  person,
  place,
  presence,
  restaurant,
  roadSignGlyph,
  signSheet,
  stay,
  tip,
  travelMode,
  tripSchema,
} from "./trip-schema";

export type Trip = z.infer<typeof tripSchema>;
export type Day = z.infer<typeof day>;
export type Moment = z.infer<typeof moment>;
export type MomentItem = z.infer<typeof momentItemSchema>;
export type MomentTime = z.infer<typeof momentTimeSchema>;
export type DayPart = (typeof DAY_PARTS)[number];
export type Person = z.infer<typeof person>;
export type PresenceKind = z.infer<typeof presence>;
export type TravelVia = Person["via"];

export type Booking = z.infer<typeof booking>;
export type Restaurant = z.infer<typeof restaurant>;
export type MapPlace = z.infer<typeof place>;
export type PlaceTier = NonNullable<MapPlace["tier"]>;
export type Tip = z.infer<typeof tip>;
export type TipKind = Tip["kind"];
export type NavLeg = z.infer<typeof navLeg>;
export type TravelMode = z.infer<typeof travelMode>;
export type Checklist = z.infer<typeof checklist>;
export type SignSheet = z.infer<typeof signSheet>;
export type RoadSignGlyph = z.infer<typeof roadSignGlyph>;
export type Flight = z.infer<typeof flight>;
export type FlightEndpoint = z.infer<typeof flightEndpoint>;
export type Highlight = z.infer<typeof highlight>;
export type HighlightKind = Highlight["kind"];
export type Lodging = z.infer<typeof lodging>;
export type Stay = z.infer<typeof stay>;

/** One person's part in a single day, for the presence chips. */
export interface DayPresence {
  id: string;
  name: string;
  initial: string;
  kind: PresenceKind;
  via: TravelVia;
}

export type TripPhase = "before" | "during" | "after";

export interface ResolvedDay {
  index: number;
  phase: TripPhase;
  /** Whole days until the trip starts (only meaningful when phase is "before"). */
  daysUntil: number;
}
