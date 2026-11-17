import { z } from "zod";
import { digest } from "#src/trips/ops/digest.ts";
import {
  itemSchema,
  type Item,
  type ItemKind,
} from "#src/trips/ops/op-schema.ts";

/** The kinds of item that the sheet has a form for. The others keep their content and only move or go. */
export const FORM_KINDS = ["dining", "place", "lodging", "tip"] as const;
export type FormKind = (typeof FORM_KINDS)[number];

export function isFormKind(kind: ItemKind): kind is FormKind {
  return FORM_KINDS.some((each) => each === kind);
}

export interface FieldSpec {
  /** The field of the item, or `booking.<field>` for a field of its booking. */
  key: string;
  input: "text" | "textarea" | "url" | "select";
  /** The values of a select. An empty value means that the field is not set. */
  options?: readonly string[];
  /** `more` puts the field in the disclosure for the fields that few people fill. */
  group: "main" | "more";
  required?: boolean;
}

const main = (key: string, input: FieldSpec["input"] = "text"): FieldSpec => ({
  key,
  input,
  group: "main",
});
const more = (
  key: string,
  input: FieldSpec["input"] = "text",
  options?: readonly string[],
): FieldSpec => ({ key, input, group: "more", options });

/** The fields of each kind, in the order that the sheet shows them. The first is the name of the item. */
export const ITEM_FIELDS: Record<FormKind, readonly FieldSpec[]> = {
  dining: [
    { ...main("name"), required: true },
    main("description", "textarea"),
    more("status", "select", ["", "booked", "pick"]),
    more("booking.date"),
    more("booking.time"),
    more("booking.party"),
    more("booking.by"),
    more("booking.contact"),
    more("booking.note"),
    more("area"),
    more("tag"),
    more("price"),
    more("website", "url"),
    more("menu", "url"),
    more("query"),
  ],
  place: [
    { ...main("name"), required: true },
    main("note", "textarea"),
    more("when"),
    more("tier", "select", ["", "primary", "backup", "fallback"]),
    more("query"),
  ],
  lodging: [
    { ...main("name"), required: true },
    main("note", "textarea"),
    more("status", "select", ["", "booked", "option", "pending"]),
    more("checkIn"),
    more("checkOut"),
    more("room"),
    more("address"),
    more("phone"),
    more("query"),
  ],
  tip: [
    { ...main("text", "textarea"), required: true },
    {
      key: "kind",
      input: "select",
      group: "main",
      options: ["info", "warn", "parking", "fuel", "drive", "transit", "money"],
    },
  ],
};

/** Whether the trip takes the text as a link, and it is one that opens in a browser. */
export function isLink(value: string) {
  return /^https?:\/\//i.test(value) && z.url().safeParse(value).success;
}

/** What the person typed, by the key of each field. */
export type FormValues = Record<string, string>;

const BOOKING = "booking.";

const recordOf = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null ? { ...value } : {};

function read(item: Item, key: string): string {
  const record = recordOf(item);
  const value = key.startsWith(BOOKING)
    ? recordOf(record.booking)[key.slice(BOOKING.length)]
    : record[key];
  return typeof value === "string" ? value : "";
}

/** The values of the form for an item, or for a new item of a kind. */
export function formOf(kind: FormKind, item?: Item): FormValues {
  const values: FormValues = {};
  for (const { key } of ITEM_FIELDS[kind]) {
    values[key] = item ? read(item, key) : "";
  }
  if (kind === "tip" && !item) values.kind = "info";
  return values;
}

/** The fields of an item as the form has them. A field with no text is null, and a booking with no field is null. */
function fieldsOf(kind: FormKind, values: FormValues) {
  const fields: Record<string, unknown> = {};
  const booking: Record<string, string> = {};
  for (const { key } of ITEM_FIELDS[kind]) {
    const value = (values[key] ?? "").trim();
    if (key.startsWith(BOOKING)) {
      if (value !== "") booking[key.slice(BOOKING.length)] = value;
    } else {
      fields[key] = value === "" ? null : value;
    }
  }
  if (kind === "dining") {
    fields.booking = Object.keys(booking).length > 0 ? booking : null;
  }
  return fields;
}

/** The fields that the form changed, for `setItem`. A field that the form does not show stays as it is. */
export function patchOf(
  kind: FormKind,
  item: Item,
  values: FormValues,
): Record<string, unknown> {
  const before = recordOf(item);
  const patch: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fieldsOf(kind, values))) {
    if (digest(before[key] ?? null) !== digest(value)) patch[key] = value;
  }
  return patch;
}

/** A new item of a kind from the form, or null when the form does not make an item of that kind. */
export function newItemOf(
  kind: FormKind,
  id: string,
  values: FormValues,
): Item | null {
  const fields = Object.fromEntries(
    Object.entries(fieldsOf(kind, values)).filter(
      ([, value]) => value !== null,
    ),
  );
  const item = itemSchema.safeParse({
    ...(kind === "dining" || kind === "place" ? { query: fields.name } : {}),
    ...fields,
    id,
    type: kind,
  });
  return item.success ? item.data : null;
}
