import { z } from "zod";
import {
  entityId,
  highlight,
  lodging,
  momentItemSchemas,
  momentTimeSchema,
} from "../trip-schema.ts";
import type { Lodging, MomentItem } from "../types.ts";

/** An item of a trip: anything a moment holds, or a lodging of a stay. */
export type Item = MomentItem | (Lodging & { type: "lodging" });
export type ItemKind = Item["type"];

/** The schema of each kind of item, which refuses a field it does not know. */
export const itemSchemas = {
  flight: momentItemSchemas.flight.strict(),
  checklist: momentItemSchemas.checklist.strict(),
  signSheet: momentItemSchemas.signSheet.strict(),
  nav: momentItemSchemas.nav.strict(),
  dining: momentItemSchemas.dining.strict(),
  place: momentItemSchemas.place.strict(),
  tip: momentItemSchemas.tip.strict(),
  lodging: lodging.extend({ type: z.literal("lodging") }).strict(),
};

/** Any item, which refuses a field that its kind does not know. */
export const itemSchema = z.discriminatedUnion("type", [
  itemSchemas.flight,
  itemSchemas.checklist,
  itemSchemas.signSheet,
  itemSchemas.nav,
  itemSchemas.dining,
  itemSchemas.place,
  itemSchemas.tip,
  itemSchemas.lodging,
]);

/** A day's list of items with no time, and the kind of item it holds. */
export const DAY_LISTS = {
  dining: "dining",
  places: "place",
  tips: "tip",
  lodging: "lodging",
} as const satisfies Record<string, ItemKind>;
export type DayList = keyof typeof DAY_LISTS;

type Patch<T> = { [K in keyof T]?: T[K] | null };
type ItemFields<T> = T extends Item ? Patch<Omit<T, "id" | "type">> : never;

/**
 * New values for the fields of an item. `null`, or text that is only space,
 * clears a field; a field that is not named stays. The kind of an item never
 * changes. For a place to eat or go, `query` follows `name` while the two
 * were the same.
 */
export type ItemPatch = ItemFields<Item>;

/** A new item. `query`, the text to find it on a map, is its name when it is not given. */
export type NewItem =
  | Exclude<Item, { type: "dining" | "place" }>
  | (Omit<Extract<Item, { type: "dining" }>, "query"> & { query?: string })
  | (Omit<Extract<Item, { type: "place" }>, "query"> & { query?: string });

const expect = z.string().min(1);
const nullable = <T extends z.ZodType>(schema: T) =>
  schema.nullable().optional();
const fields = z.record(z.string(), z.unknown());

/** Where an item is: in a moment, or in one of a day's lists with no time (`lodging` is the day's stay). */
const itemPlace = z.union([
  z.strictObject({ momentId: entityId }),
  z.strictObject({
    dayId: entityId,
    list: z.enum(["dining", "places", "tips", "lodging"]),
  }),
]);
export type ItemPlace = z.infer<typeof itemPlace>;

/**
 * One change to a trip. Each op on a thing that exists carries `expect`,
 * the `digest` of that thing as the sender last saw it (see `expectedOf`).
 * The payloads of items are checked by `applyOps`, by the kind of the item.
 */
export const opSchema = z.discriminatedUnion("op", [
  z.strictObject({
    op: z.literal("setTrip"),
    fields: z.strictObject({
      title: nullable(z.string()),
      subtitle: nullable(z.string()),
      party: nullable(z.string()),
      timeZone: nullable(z.string()),
      language: nullable(z.enum(["en", "zh"])),
    }),
    expect,
  }),
  z.strictObject({
    op: z.literal("setFirstDate"),
    date: z.iso.date(),
    expect,
  }),
  z.strictObject({
    op: z.literal("addDay"),
    id: entityId,
    before: entityId.optional(),
  }),
  z.strictObject({ op: z.literal("removeDay"), id: entityId, expect }),
  z.strictObject({
    op: z.literal("moveDay"),
    id: entityId,
    before: entityId.optional(),
    expect,
  }),
  z.strictObject({
    op: z.literal("setDay"),
    id: entityId,
    fields: z.strictObject({
      title: nullable(z.string()),
      route: nullable(z.string()),
      driving: nullable(z.string()),
      drivingMinutes: nullable(z.number()),
      weather: nullable(
        z.object({
          temp: z.string(),
          summary: z.string(),
          note: z.string().optional(),
        }),
      ),
      coords: nullable(z.object({ lat: z.number(), lon: z.number() })),
    }),
    expect,
  }),
  z.strictObject({
    op: z.literal("addMoment"),
    dayId: entityId,
    moment: z.strictObject({
      id: entityId,
      time: momentTimeSchema,
      text: z.string().optional(),
      highlight: highlight.optional(),
    }),
  }),
  z.strictObject({
    op: z.literal("setMoment"),
    id: entityId,
    fields: z.strictObject({
      time: momentTimeSchema.optional(),
      text: nullable(z.string()),
      highlight: nullable(highlight),
    }),
    expect,
  }),
  z.strictObject({
    op: z.literal("moveMoment"),
    id: entityId,
    dayId: entityId,
    expect,
  }),
  z.strictObject({ op: z.literal("removeMoment"), id: entityId, expect }),
  z.strictObject({
    op: z.literal("addItem"),
    to: itemPlace,
    before: entityId.optional(),
    item: z.custom<NewItem>(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        "type" in value &&
        typeof value.type === "string" &&
        Object.hasOwn(itemSchemas, value.type),
    ),
  }),
  z.strictObject({
    op: z.literal("setItem"),
    id: entityId,
    fields: fields,
    expect,
  }),
  z.strictObject({
    op: z.literal("moveItem"),
    id: entityId,
    to: itemPlace,
    before: entityId.optional(),
    expect,
  }),
  z.strictObject({ op: z.literal("removeItem"), id: entityId, expect }),
  z.strictObject({
    op: z.literal("setStay"),
    dayId: entityId,
    fields: z.strictObject({
      summary: nullable(z.string()),
      note: nullable(z.string()),
      bookingUrl: nullable(z.string()),
    }),
    expect,
  }),
]);

export type Op = z.infer<typeof opSchema>;
