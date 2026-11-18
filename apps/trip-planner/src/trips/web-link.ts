import type { Trip } from "./types.ts";

const LINK_FIELDS = ["website", "menu", "track", "bookingUrl"] as const;

/** An http or https address with no user name or password: the only link that a trip shows. */
function is(text: string): boolean {
  if (!URL.canParse(text)) return false;
  const url = new URL(text);
  return (
    (url.protocol === "https:" || url.protocol === "http:") &&
    url.username === "" &&
    url.password === ""
  );
}

/** The first link field of a thing or of the fields of an op that holds text but no web link, or null. */
function badField(fields: object): string | null {
  for (const key of LINK_FIELDS) {
    const value: unknown = Reflect.get(fields, key);
    if (typeof value === "string" && value.trim() !== "" && !is(value)) {
      return key;
    }
  }
  return null;
}

/** The first link field in a trip that holds no web link, or null. */
function badIn(trip: Trip): string | null {
  for (const day of trip.days) {
    const things = [
      day.stay,
      ...day.dining,
      ...day.moments.flatMap((moment) => moment.items),
    ];
    for (const thing of things) {
      const field = badField(thing);
      if (field !== null) return field;
    }
  }
  return null;
}

export const webLink = { is, badField, badIn };
