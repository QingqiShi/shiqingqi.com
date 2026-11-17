import { describe, expect, it } from "vitest";
import sample from "./sample-trip.json";
import { tripSchema } from "./trip-schema";

function withSample(change: (trip: typeof sample) => void) {
  const trip = structuredClone(sample);
  change(trip);
  return tripSchema.safeParse(trip);
}

describe("tripSchema", () => {
  it("accepts the sample trip", () => {
    expect(tripSchema.safeParse(sample).success).toBe(true);
  });

  it("reads a stored document that still holds the slug of its old path", () => {
    const result = tripSchema.safeParse({ ...sample, slug: "gb" });
    expect(result.success).toBe(true);
    expect(result.data).not.toHaveProperty("slug");
  });

  it("refuses an id used twice", () => {
    const result = withSample((trip) => {
      trip.days[1].moments[0].id = trip.days[0].moments[0].id;
    });
    expect(result.success).toBe(false);
  });

  it("refuses a stay that repeats a later night", () => {
    const result = withSample((trip) => {
      trip.days[1].stay.sameAs = { dayId: "day2sample", label: "Later" };
    });
    expect(result.success).toBe(false);
  });

  it("refuses a person on a day the trip does not have", () => {
    const result = withSample((trip) => {
      trip.people[0].days = {
        ...trip.people[0].days,
        ...{ nosuchday: "present" },
      };
    });
    expect(result.success).toBe(false);
  });

  it("refuses days out of date order", () => {
    const result = withSample((trip) => {
      trip.days[2].date = trip.days[0].date;
    });
    expect(result.success).toBe(false);
  });
});
