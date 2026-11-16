import { z } from "zod";
import { DAY_PARTS } from "./day-parts";

export const TRIP_SCHEMA_VERSION = 1;

const id = z.string().regex(/^[a-z0-9-]{2,40}$/);
const text = z.string().trim().min(1);
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
const isoDate = z.iso.date();

/** A clock time, a part of the day, or `backup` for a plan B with no time. */
export const momentTimeSchema = z.union([
  clock,
  z.enum(DAY_PARTS),
  z.literal("backup"),
]);

export const travelMode = z.enum(["driving", "transit", "walking"]);

export const booking = z.object({
  date: text.optional(),
  time: text.optional(),
  party: text.optional(),
  by: text.optional(),
  contact: text.optional(),
  note: text.optional(),
});

export const restaurant = z.object({
  name: text,
  query: text,
  area: text.optional(),
  tag: text,
  description: text,
  price: text.optional(),
  website: z.url().optional(),
  menu: z.url().optional(),
  michelin: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional(),
  status: z.enum(["booked", "pick"]).optional(),
  booking: booking.optional(),
});

export const place = z.object({
  name: text,
  query: text,
  note: text.optional(),
  tier: z.enum(["primary", "backup", "fallback"]).optional(),
  when: text.optional(),
});

export const tip = z.object({
  kind: z.enum([
    "parking",
    "fuel",
    "drive",
    "transit",
    "money",
    "warn",
    "info",
  ]),
  text,
});

export const navLeg = z.object({
  label: text,
  to: text,
  from: text.optional(),
  mode: travelMode.optional(),
  note: text.optional(),
  waypoints: z.array(text).optional(),
});

export const checklist = z.object({
  title: text,
  items: z.array(z.object({ id, text })).min(1),
  note: text.optional(),
});

export const roadSignGlyph = z.enum([
  "roadColors",
  "noEntry",
  "oneWay",
  "giveWay",
  "priority",
  "noParking",
  "ztl",
  "speedLimit",
  "speedCamera",
]);

export const signSheet = z.object({
  title: text,
  signs: z
    .array(z.object({ glyph: roadSignGlyph, name: text, meaning: text }))
    .min(1),
  note: text.optional(),
});

export const flightEndpoint = z.object({
  code: z.string().regex(/^[A-Z]{3}$/),
  city: text,
  time: clock.optional(),
  scheduledTime: clock.optional(),
  terminal: text.optional(),
  dayOffset: z.number().int().min(-1).max(2).optional(),
});

export const flight = z.object({
  number: text,
  airline: text.optional(),
  passenger: text.optional(),
  statusLabel: text.optional(),
  from: flightEndpoint,
  to: flightEndpoint,
  track: z.url().optional(),
  note: text.optional(),
});

export const momentItemSchema = z.discriminatedUnion("type", [
  flight.extend({ id, type: z.literal("flight") }),
  checklist.extend({ id, type: z.literal("checklist") }),
  signSheet.extend({ id, type: z.literal("signSheet") }),
  navLeg.extend({ id, type: z.literal("nav") }),
  restaurant.extend({ id, type: z.literal("dining") }),
  place.extend({ id, type: z.literal("place") }),
  tip.extend({ id, type: z.literal("tip") }),
]);

export const highlight = z.object({
  label: text,
  kind: z.enum([
    "flight",
    "pickup",
    "dropoff",
    "checkin",
    "checkout",
    "reservation",
    "transit",
    "drive",
  ]),
  query: text.optional(),
  mode: travelMode.optional(),
});

export const moment = z.object({
  id,
  time: momentTimeSchema,
  text: text.optional(),
  /** Marks the moment as a fixed commitment in the day's at-a-glance card. */
  highlight: highlight.optional(),
  items: z.array(momentItemSchema),
});

export const lodging = z.object({
  id,
  name: text,
  query: text.optional(),
  address: text.optional(),
  phone: text.optional(),
  checkIn: text.optional(),
  checkOut: text.optional(),
  room: text.optional(),
  note: text.optional(),
  status: z.enum(["booked", "option", "pending"]),
  recommended: z.boolean().optional(),
});

export const stay = z.object({
  summary: text,
  lodging: z.array(lodging),
  /** The same bed as an earlier night. */
  sameAs: z.object({ dayId: id, label: text }).optional(),
  note: text.optional(),
  bookingUrl: z.url().optional(),
});

export const day = z.object({
  id,
  date: isoDate,
  title: text,
  route: text,
  driving: text.optional(),
  /** The time at the wheel that `driving` describes, for sums and charts. */
  drivingMinutes: z.number().int().min(0).optional(),
  /** The written forecast, shown when no live forecast covers the day. */
  weather: z
    .object({ temp: text, summary: text, note: text.optional() })
    .optional(),
  /** Where to fetch the day's live weather. */
  coords: z
    .object({
      lat: z.number().min(-90).max(90),
      lon: z.number().min(-180).max(180),
    })
    .optional(),
  moments: z.array(moment),
  /** Heads-ups for the whole day. */
  tips: z.array(tip.extend({ id })),
  /** Places to eat with no meal slot. */
  dining: z.array(restaurant.extend({ id })),
  /** Places to go with no time. */
  places: z.array(place.extend({ id })),
  stay,
});

export const presence = z.enum(["arrive", "depart", "home", "present"]);

export const person = z.object({
  id,
  name: text,
  /** One character for the avatar. */
  initial: z.string().trim().min(1).max(2),
  via: z.enum(["air", "ground"]),
  /** The days the person takes part in, and how. */
  days: z.record(id, presence),
});

export const tripSchema = z
  .object({
    schemaVersion: z.literal(TRIP_SCHEMA_VERSION),
    id,
    slug: z.string().regex(/^[a-z0-9-]{1,40}$/),
    title: text,
    subtitle: text,
    /** A short line about who travels, such as "3 人自驾". */
    party: text,
    /** The language the trip's text is written in. */
    language: z.enum(["en", "zh"]),
    /** An IANA zone, such as Europe/London. It sets "today" and "now". */
    timeZone: z.string().refine(isTimeZone, "Unknown time zone"),
    people: z.array(person),
    days: z.array(day).min(1),
  })
  .superRefine((trip, ctx) => {
    const seen = new Set<string>();
    const claim = (value: string, path: (string | number)[]) => {
      if (seen.has(value)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate id ${value}`,
          path,
        });
      }
      seen.add(value);
    };
    const dayIds = new Set(trip.days.map((d) => d.id));

    claim(trip.id, ["id"]);
    trip.people.forEach((p, pi) => {
      claim(p.id, ["people", pi, "id"]);
      for (const dayId of Object.keys(p.days)) {
        if (!dayIds.has(dayId)) {
          ctx.addIssue({
            code: "custom",
            message: `Unknown day ${dayId}`,
            path: ["people", pi, "days", dayId],
          });
        }
      }
    });

    trip.days.forEach((d, di) => {
      claim(d.id, ["days", di, "id"]);
      if (di > 0 && trip.days[di - 1].date >= d.date) {
        ctx.addIssue({
          code: "custom",
          message: "Days must be in date order, one per date",
          path: ["days", di, "date"],
        });
      }
      d.moments.forEach((m, mi) => {
        claim(m.id, ["days", di, "moments", mi, "id"]);
        m.items.forEach((item, ii) => {
          claim(item.id, ["days", di, "moments", mi, "items", ii, "id"]);
          if (item.type === "checklist") {
            item.items.forEach((entry, ei) => {
              claim(entry.id, [
                "days",
                di,
                "moments",
                mi,
                "items",
                ii,
                "items",
                ei,
                "id",
              ]);
            });
          }
        });
      });
      for (const [key, list] of [
        ["tips", d.tips],
        ["dining", d.dining],
        ["places", d.places],
        ["lodging", d.stay.lodging],
      ] as const) {
        list.forEach((entry, i) => {
          claim(entry.id, ["days", di, key, i, "id"]);
        });
      }
      const sameAs = d.stay.sameAs;
      if (
        sameAs &&
        !trip.days.slice(0, di).some((e) => e.id === sameAs.dayId)
      ) {
        ctx.addIssue({
          code: "custom",
          message: "A stay can only repeat an earlier night",
          path: ["days", di, "stay", "sameAs", "dayId"],
        });
      }
    });
  });

function isTimeZone(zone: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: zone });
    return true;
  } catch {
    return false;
  }
}
