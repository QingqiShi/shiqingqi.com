import { describe, expect, it } from "vitest";
import sample from "../sample-trip.json";
import { tripSchema } from "../trip-schema.ts";
import type { Trip } from "../types.ts";
import { applyOps, withExpect, type DraftOp } from "./apply-ops.ts";
import { newTrip } from "./new-trip.ts";
import type { ItemPatch } from "./op-schema.ts";

const lisbon = tripSchema.parse(sample);

function apply(trip: Trip, drafts: DraftOp[]) {
  return applyOps(trip, withExpect(trip, drafts));
}

function applied(trip: Trip, drafts: DraftOp[]): Trip {
  const result = apply(trip, drafts);
  if (result.status !== "applied") {
    throw new Error(`Not applied: ${JSON.stringify(result)}`);
  }
  return result.trip;
}

const plans = (trip: Trip) => trip.days.map((day) => [day.date, day.id]);
function day(trip: Trip, id: string) {
  const found = trip.days.find((d) => d.id === id);
  if (!found) throw new Error(`No day ${id}.`);
  return found;
}

describe("trip", () => {
  it("sets details, and moves every day by the same number of days with the first date", () => {
    const trip = applied(lisbon, [
      { op: "setTrip", fields: { title: "Porto first", subtitle: null } },
      { op: "setFirstDate", date: "2027-05-01" },
    ]);
    expect(trip.title).toBe("Porto first");
    expect(trip.subtitle).toBeUndefined();
    expect(trip.days.map((d) => d.date)).toEqual([
      "2027-05-01",
      "2027-05-02",
      "2027-05-03",
      "2027-05-04",
      "2027-05-05",
    ]);
  });
});

describe("days", () => {
  it("adds an empty day in place and moves each later plan one date on", () => {
    const trip = applied(lisbon, [
      { op: "addDay", id: "restday", before: "day2sample" },
    ]);
    expect(plans(trip)).toEqual([
      ["2027-04-16", "day0sample"],
      ["2027-04-17", "day1sample"],
      ["2027-04-18", "restday"],
      ["2027-04-19", "day2sample"],
      ["2027-04-20", "day3sample"],
      ["2027-04-21", "day4sample"],
    ]);
    expect(day(trip, "restday").title).toBeUndefined();
  });

  it("removes a day, moves each later plan one date back, and drops who was there that day", () => {
    const trip = applied(lisbon, [{ op: "removeDay", id: "day1sample" }]);
    expect(plans(trip)).toEqual([
      ["2027-04-16", "day0sample"],
      ["2027-04-17", "day2sample"],
      ["2027-04-18", "day3sample"],
      ["2027-04-19", "day4sample"],
    ]);
    expect(trip.people.find((p) => p.id === "rita")?.days).toEqual({
      day2sample: "home",
    });
  });

  it("moves a plan between the dates, which stay where they were", () => {
    const trip = applied(lisbon, [
      { op: "moveDay", id: "day4sample", before: "day1sample" },
    ]);
    expect(plans(trip)).toEqual([
      ["2027-04-16", "day0sample"],
      ["2027-04-17", "day4sample"],
      ["2027-04-18", "day1sample"],
      ["2027-04-19", "day2sample"],
      ["2027-04-20", "day3sample"],
    ]);
  });

  it("keeps at least one day", () => {
    const one = newTrip({
      title: "A day out",
      firstDate: "2027-01-01",
      days: 1,
      timeZone: "Europe/Lisbon",
      language: "en",
    });
    const result = apply(one, [{ op: "removeDay", id: one.days[0].id }]);
    expect(result).toMatchObject({ status: "refused", index: 0 });
  });
});

describe("stays", () => {
  it("gives a stay its own copy of a night that is gone or now later", () => {
    const removed = applied(lisbon, [{ op: "removeDay", id: "day0sample" }]);
    const sintra = day(removed, "day1sample").stay;
    expect(sintra.sameAs).toBeUndefined();
    expect(sintra.lodging.map((l) => l.name)).toEqual(["Baixa House"]);
    expect(sintra.lodging[0].id).not.toBe("l0baixa");

    const moved = applied(lisbon, [
      { op: "moveDay", id: "day3sample", before: "day2sample" },
    ]);
    expect(day(moved, "day3sample").stay.sameAs).toBeUndefined();
    expect(day(moved, "day3sample").stay.lodging.map((l) => l.name)).toEqual([
      "Casa do Douro",
    ]);
    // Every caller makes the same ids for the copies.
    expect(applied(lisbon, [{ op: "removeDay", id: "day0sample" }])).toEqual(
      removed,
    );
  });

  it("sets the summary, note and booking link of a stay", () => {
    const trip = applied(lisbon, [
      {
        op: "setStay",
        dayId: "day4sample",
        fields: { summary: "Airport hotel", note: null },
      },
    ]);
    expect(day(trip, "day4sample").stay).toEqual({
      summary: "Airport hotel",
      lodging: [],
    });
  });
});

describe("moments", () => {
  it("adds, sets, moves and removes a moment", () => {
    const trip = applied(lisbon, [
      {
        op: "addMoment",
        dayId: "day1sample",
        moment: { id: "m1lunch", time: "13:00", text: "Lunch in Sintra" },
      },
      { op: "setMoment", id: "m1lunch", fields: { time: "13:30" } },
      { op: "moveMoment", id: "m1backup", dayId: "day2sample" },
      { op: "removeMoment", id: "m0metro" },
    ]);
    expect(day(trip, "day1sample").moments.map((m) => [m.id, m.time])).toEqual([
      ["m1signs", "morning"],
      ["m1lunch", "13:30"],
    ]);
    expect(day(trip, "day2sample").moments.at(-1)?.id).toBe("m1backup");
    expect(day(trip, "day0sample").moments.map((m) => m.id)).not.toContain(
      "m0metro",
    );
  });

  it("moves a meal to a new time in one batch, and drops the moment it leaves empty", () => {
    const withSnack = applied(lisbon, [
      {
        op: "addMoment",
        dayId: "day2sample",
        moment: { id: "m2snack", time: "16:00" },
      },
      {
        op: "addItem",
        to: { momentId: "m2snack" },
        item: { id: "i2nata", type: "dining", name: "Manteigaria" },
      },
    ]);
    const later = applied(withSnack, [
      {
        op: "addMoment",
        dayId: "day2sample",
        moment: { id: "m2late", time: "16:30" },
      },
      { op: "moveItem", id: "i2nata", to: { momentId: "m2late" } },
    ]);
    const moments = day(later, "day2sample").moments;
    expect(moments.map((m) => m.id)).not.toContain("m2snack");
    expect(moments.find((m) => m.id === "m2late")?.items).toEqual([
      {
        id: "i2nata",
        type: "dining",
        name: "Manteigaria",
        query: "Manteigaria",
      },
    ]);
    // A moment that keeps its text stays when its items go.
    const emptied = applied(lisbon, [{ op: "removeItem", id: "i0metro" }]);
    expect(day(emptied, "day0sample").moments.map((m) => m.id)).toContain(
      "m0metro",
    );
  });

  it("keeps a moment that a batch adds with nothing in it, for a later save to fill", () => {
    const added = applied(lisbon, [
      {
        op: "addMoment",
        dayId: "day2sample",
        moment: { id: "m2snack", time: "16:00" },
        before: "m2checkin",
      },
    ]);
    expect(day(added, "day2sample").moments.map((m) => m.id)).toEqual([
      "m2out",
      "m2train",
      "m2snack",
      "m2checkin",
      "m2evening",
    ]);
  });
});

describe("items", () => {
  it("adds an item with a name only, and finds it on a map by that name", () => {
    const trip = applied(lisbon, [
      {
        op: "addItem",
        to: { dayId: "day3sample", list: "places" },
        item: { id: "p3lello", type: "place", name: "Livraria Lello" },
      },
    ]);
    expect(day(trip, "day3sample").places).toEqual([
      { id: "p3lello", name: "Livraria Lello", query: "Livraria Lello" },
    ]);
  });

  it("sets fields, where the map search follows a name it equalled, and never changes the kind", () => {
    const added = applied(lisbon, [
      {
        op: "addItem",
        to: { dayId: "day3sample", list: "places" },
        item: { id: "p3lello", type: "place", name: "Lello" },
      },
    ]);
    const renamed = applied(added, [
      {
        op: "setItem",
        id: "p3lello",
        fields: { name: "Livraria Lello", note: "Buy a ticket first" },
      },
    ]);
    expect(day(renamed, "day3sample").places[0]).toEqual({
      id: "p3lello",
      name: "Livraria Lello",
      query: "Livraria Lello",
      note: "Buy a ticket first",
    });
    const retyped = apply(added, [
      {
        op: "setItem",
        id: "p3lello",
        fields: JSON.parse('{"type":"tip"}') as ItemPatch,
      },
    ]);
    expect(retyped).toMatchObject({ status: "refused", index: 0 });
  });

  it("moves an item to a list that holds its kind, before an item or at the end when that item is gone", () => {
    const trip = applied(lisbon, [
      {
        op: "moveItem",
        id: "i0taberna",
        to: { dayId: "day0sample", list: "dining" },
        before: "r0pasteis",
      },
      {
        op: "moveItem",
        id: "i0castle",
        to: { dayId: "day3sample", list: "places" },
        before: "nosuchitem",
      },
    ]);
    expect(day(trip, "day0sample").dining.map((r) => r.id)).toEqual([
      "i0taberna",
      "r0pasteis",
    ]);
    expect(day(trip, "day0sample").dining[0]).not.toHaveProperty("type");
    expect(day(trip, "day3sample").places.map((p) => p.id)).toEqual([
      "i0castle",
    ]);
    const wrongList = apply(lisbon, [
      {
        op: "moveItem",
        id: "i0flight",
        to: { dayId: "day0sample", list: "places" },
      },
    ]);
    expect(wrongList).toMatchObject({ status: "refused", index: 0 });
  });

  it("removes an item", () => {
    const trip = applied(lisbon, [{ op: "removeItem", id: "l2douro" }]);
    expect(day(trip, "day2sample").stay.lodging).toEqual([]);
  });
});

describe("a batch", () => {
  it("applies all or none, and names the op that cannot apply and why", () => {
    const before = structuredClone(lisbon);
    const result = apply(lisbon, [
      { op: "setTrip", fields: { title: "Changed" } },
      { op: "setItem", id: "i0castle", fields: { name: null } },
    ]);
    expect(result).toMatchObject({ status: "refused", index: 1 });
    expect(result.status === "refused" && result.reason).toMatch(/name/);
    expect(lisbon).toEqual(before);
  });

  it("applies two changes to one thing when the first has text that the schema trims", () => {
    const trip = applied(lisbon, [
      { op: "setDay", id: "day0sample", fields: { title: " Rome " } },
      { op: "setDay", id: "day0sample", fields: { route: "Rome → Ostia" } },
    ]);
    expect(day(trip, "day0sample")).toMatchObject({
      title: "Rome",
      route: "Rome → Ostia",
    });
  });

  it("refuses a batch that makes a trip the schema refuses", () => {
    const result = apply(lisbon, [{ op: "addDay", id: "day0sample" }]);
    expect(result).toMatchObject({ status: "refused", index: 0 });
    expect(result.status === "refused" && result.reason).toMatch(/Duplicate/);
  });

  it("refuses a change to a thing that someone else changed, and keeps the sender's change when sent again", () => {
    const mine = withExpect(lisbon, [
      { op: "setItem", id: "i0castle", fields: { note: "Go early" } },
    ]);
    const theirs = applied(lisbon, [
      { op: "setItem", id: "i0castle", fields: { note: "Closed on Mondays" } },
    ]);

    const conflict = applyOps(theirs, mine);
    expect(conflict).toMatchObject({
      status: "conflict",
      index: 0,
      current: { id: "i0castle", note: "Closed on Mondays" },
    });
    const [op] = mine;
    if (conflict.status !== "conflict" || conflict.expect === null) return;
    if (op.op !== "setItem") return;

    const useMine = applyOps(theirs, [{ ...op, expect: conflict.expect }]);
    expect(useMine.status).toBe("applied");
    const castle =
      useMine.status === "applied" &&
      useMine.trip.days[0].moments
        .flatMap((m) => m.items)
        .find((item) => item.id === "i0castle");
    expect(castle).toMatchObject({ note: "Go early" });

    // A change to another thing does not stand in the way.
    const other = applied(lisbon, [
      { op: "setItem", id: "i0view", fields: { note: "Best at dusk" } },
    ]);
    expect(applyOps(other, mine).status).toBe("applied");
    // A thing that is gone is a conflict with nothing current.
    const gone = applied(lisbon, [{ op: "removeItem", id: "i0castle" }]);
    expect(applyOps(gone, mine)).toMatchObject({
      status: "conflict",
      current: null,
      expect: null,
    });
  });
});
