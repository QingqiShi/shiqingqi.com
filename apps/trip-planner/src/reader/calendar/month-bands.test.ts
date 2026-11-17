import { describe, expect, it } from "vitest";
import { calendarWeeks } from "./calendar-weeks";
import { monthBands } from "./month-bands";
import { tripStays } from "./trip-stays";
import sample from "@/trips/sample-trip.json";
import { tripSchema } from "@/trips/trip-schema";

const trip = tripSchema.parse(sample);

describe("calendarWeeks", () => {
  it("gives whole weeks from Monday, across the end of a month", () => {
    const weeks = calendarWeeks([
      { date: "2027-01-30" },
      { date: "2027-02-02" },
    ]);
    expect(weeks).toEqual([
      [
        "2027-01-25",
        "2027-01-26",
        "2027-01-27",
        "2027-01-28",
        "2027-01-29",
        "2027-01-30",
        "2027-01-31",
      ],
      [
        "2027-02-01",
        "2027-02-02",
        "2027-02-03",
        "2027-02-04",
        "2027-02-05",
        "2027-02-06",
        "2027-02-07",
      ],
    ]);
  });
});

describe("tripStays", () => {
  it("joins a night to the earlier night with the same bed, and gives the last day no bed", () => {
    const stays = tripStays(trip.days);
    const nights = trip.days.map((day) => {
      const stay = stays.get(day.date);
      return stay ? `${stay.name} ${String(stay.nights)}` : null;
    });
    expect(nights).toEqual([
      "Baixa House 2",
      "Baixa House 2",
      "Casa do Douro 2",
      "Casa do Douro 2",
      null,
    ]);
  });
});

describe("monthBands", () => {
  it("runs each stay from midday to midday, and carries the night of Sunday into the next week", () => {
    // The sample trip runs from Friday 16 to Tuesday 20 April 2027.
    const bands = monthBands(calendarWeeks(trip.days), tripStays(trip.days));
    const shape = bands.map((week) =>
      week.map((band) => ({
        name: band.stay.name,
        tracks: [band.start, band.end],
        continued: band.continued,
        continues: band.continues,
        label: band.label,
      })),
    );
    expect(shape).toEqual([
      [
        {
          name: "Baixa House",
          tracks: [10, 14],
          continued: false,
          continues: false,
          label: "nights",
        },
        {
          name: "Casa do Douro",
          tracks: [14, 15],
          continued: false,
          continues: true,
          label: null,
        },
      ],
      [
        {
          name: "Casa do Douro",
          tracks: [1, 4],
          continued: true,
          continues: false,
          label: "nights",
        },
      ],
    ]);
  });
});
