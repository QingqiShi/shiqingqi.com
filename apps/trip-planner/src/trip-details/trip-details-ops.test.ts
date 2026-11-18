import { describe, expect, it } from "vitest";
import { tripDetailsOps, type TripDetails } from "./trip-details-ops.ts";

const opened: TripDetails = {
  title: "Lisbon",
  subtitle: "",
  party: "3 people",
  firstDate: "2027-04-16",
  timeZone: "Europe/Lisbon",
};

describe("tripDetailsOps", () => {
  // Another member renamed the trip and moved its dates while the form was
  // open. A save of only "Who travels" then wrote the old title and the old
  // first day back.
  it("sends only the details that the person changed in the form", () => {
    expect(tripDetailsOps(opened, { ...opened, party: "4 people" })).toEqual([
      { op: "setTrip", fields: { party: "4 people" } },
    ]);
    expect(tripDetailsOps(opened, opened)).toEqual([]);
  });

  it("takes a line away when the person empties it, and moves the days with a new first day", () => {
    expect(
      tripDetailsOps(opened, {
        ...opened,
        party: " ",
        firstDate: "2027-05-01",
      }),
    ).toEqual([
      { op: "setTrip", fields: { party: null } },
      { op: "setFirstDate", date: "2027-05-01" },
    ]);
  });
});
