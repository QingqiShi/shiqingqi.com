import { describe, expect, it } from "vitest";
import { addDays } from "../domain/dates/add-days.ts";
import { planBankMatches, type MatchCandidate } from "./plan-bank-matches.ts";

function candidate(
  transactionId: string,
  overrides: Partial<MatchCandidate> = {},
): MatchCandidate {
  return {
    transactionId,
    status: "posted",
    date: "2026-10-05",
    amountMinor: -1000,
    createdAt: new Date("2026-10-05T10:00:00Z"),
    ...overrides,
  };
}

function row(date: string, amountMinor = -1000) {
  return { date, amountMinor };
}

function link(transactionId: string) {
  return { action: "link", transactionId } as const;
}

function confirm(transactionId: string) {
  return { action: "confirm", transactionId } as const;
}

const create = { action: "create" } as const;

describe("planBankMatches", () => {
  it("creates when nothing has the same signed amount within three days", () => {
    expect(
      planBankMatches(
        [row("2026-10-05")],
        [
          candidate("other-amount", { amountMinor: -1001 }),
          candidate("other-sign", { amountMinor: 1000 }),
          candidate("too-early", { date: "2026-10-01" }),
          candidate("too-late", { date: "2026-10-09" }),
        ],
      ),
    ).toEqual([create]);
  });

  it("links the nearest date, then the earliest created, then the lowest id", () => {
    expect(
      planBankMatches(
        [row("2026-10-05")],
        [
          candidate("far", { date: "2026-10-03" }),
          candidate("late", { createdAt: new Date("2026-10-05T12:00:00Z") }),
          candidate("b-early", {
            createdAt: new Date("2026-10-05T08:00:00Z"),
          }),
          candidate("a-early", {
            createdAt: new Date("2026-10-05T08:00:00Z"),
          }),
        ],
      ),
    ).toEqual([link("a-early")]);
  });

  it("matches a chain of repeated fares to the Transactions one day before them", () => {
    const days = ["2026-10-05", "2026-10-06", "2026-10-07", "2026-10-08"];
    const fares = days.flatMap((day) => [row(day, -720), row(day, -330)]);
    const transactions = days.flatMap((day) => [
      candidate(`tfl-${day}`, { date: addDays(day, -1), amountMinor: -720 }),
      candidate(`bus-${day}`, { date: addDays(day, -1), amountMinor: -330 }),
    ]);

    expect(planBankMatches(fares, transactions)).toEqual(
      days.flatMap((day) => [link(`tfl-${day}`), link(`bus-${day}`)]),
    );
  });

  it("matches more rows than taking each row's nearest candidate in turn", () => {
    expect(
      planBankMatches(
        [row("2026-10-05"), row("2026-10-08")],
        [
          candidate("same-day", { date: "2026-10-05" }),
          candidate("three-before", { date: "2026-10-02" }),
        ],
      ),
    ).toEqual([link("three-before"), link("same-day")]);
  });

  it("confirms an Expected Transaction before it links a nearer posted one", () => {
    expect(
      planBankMatches(
        [row("2026-10-05")],
        [
          candidate("posted"),
          candidate("expected", { status: "expected", date: "2026-10-08" }),
        ],
      ),
    ).toEqual([confirm("expected")]);
  });

  it("confirms more Expected Transactions over a smaller total gap", () => {
    expect(
      planBankMatches(
        [row("2026-10-05"), row("2026-10-06")],
        [
          candidate("posted-5", { date: "2026-10-05" }),
          candidate("posted-6", { date: "2026-10-06" }),
          candidate("expected", { status: "expected", date: "2026-10-09" }),
        ],
      ),
    ).toEqual([link("posted-5"), confirm("expected")]);
  });

  it("matches more rows before it confirms more Expected Transactions", () => {
    expect(
      planBankMatches(
        [row("2026-10-05"), row("2026-10-10")],
        [
          candidate("posted", { date: "2026-10-05" }),
          candidate("expected", { status: "expected", date: "2026-10-07" }),
        ],
      ),
    ).toEqual([link("posted"), confirm("expected")]);
  });

  it("gives the same plan for any order of the candidates, in the order of the rows", () => {
    const rows = [
      row("2026-10-08"),
      row("2026-10-05"),
      row("2026-10-05"),
      row("2026-10-06", -500),
    ];
    const candidates = [
      candidate("a", { date: "2026-10-06" }),
      candidate("b", { date: "2026-10-04" }),
      candidate("c", {
        date: "2026-10-06",
        createdAt: new Date("2026-10-01T00:00:00Z"),
      }),
      candidate("d", { date: "2026-10-06", amountMinor: -500 }),
      candidate("e", { date: "2026-10-07", status: "expected" }),
    ];
    const plan = planBankMatches(rows, candidates);

    expect(plan).toEqual([confirm("e"), link("c"), link("a"), link("d")]);
    for (let shift = 1; shift < candidates.length; shift++) {
      const turned = [
        ...candidates.slice(shift),
        ...candidates.slice(0, shift),
      ];
      expect(planBankMatches(rows, turned)).toEqual(plan);
      expect(planBankMatches(rows, turned.toReversed())).toEqual(plan);
    }
  });

  it("plans years of daily rows of one amount", () => {
    const days = Array.from({ length: 20_000 }, (_, index) =>
      addDays("2000-01-01", index),
    );

    const plan = planBankMatches(
      days.map((day) => row(day)),
      days.map((day) => candidate(day, { date: addDays(day, 1) })),
    );

    expect(plan.every((match) => match.action === "link")).toBe(true);
    expect(plan.at(-1)).toEqual(link(days.at(-1) ?? ""));
  });

  it("matches the earlier of two rows that want one candidate", () => {
    expect(
      planBankMatches(
        [row("2026-10-05"), row("2026-10-05")],
        [candidate("only")],
      ),
    ).toEqual([link("only"), create]);
  });
});
