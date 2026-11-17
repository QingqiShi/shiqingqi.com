import { describe, expect, it } from "vitest";
import { buildDayFeed } from "./build-day-feed";
import sample from "@/trips/sample-trip.json";
import { tripSchema } from "@/trips/trip-schema";

const trip = tripSchema.parse(sample);

describe("buildDayFeed", () => {
  it("orders clock times and parts of the day, and leaves out moments with only a highlight", () => {
    expect(buildDayFeed(trip.days[0]).map((moment) => moment.id)).toEqual([
      "m0flight",
      "m0metro",
      "m0afternoon",
      "m0dinner",
    ]);
  });

  it("puts a backup plan after the day", () => {
    expect(buildDayFeed(trip.days[1]).map((moment) => moment.id)).toEqual([
      "m1signs",
      "m1backup",
    ]);
  });
});
