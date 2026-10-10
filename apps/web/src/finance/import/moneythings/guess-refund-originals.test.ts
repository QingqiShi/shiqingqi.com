import { describe, expect, it } from "vitest";
import {
  guessRefundOriginals,
  type PossibleOriginal,
  type RefundToPlace,
} from "./guess-refund-originals.ts";

function refund(
  id: string,
  fields: Partial<RefundToPlace> & Pick<RefundToPlace, "date" | "amountMinor">,
): RefundToPlace {
  return { id, accountId: "card", payeeId: null, text: "", ...fields };
}

function expense(
  id: string,
  fields: Partial<PossibleOriginal> &
    Pick<PossibleOriginal, "date" | "amountMinor">,
): PossibleOriginal {
  return {
    id,
    accountId: "card",
    payeeId: null,
    text: "",
    refundedMinor: 0,
    categoryId: "clothes",
    ...fields,
  };
}

function originalsOf(refunds: RefundToPlace[], originals: PossibleOriginal[]) {
  return Object.fromEntries(
    guessRefundOriginals(refunds, originals).map((guess) => [
      guess.refundId,
      guess.original?.id ?? null,
    ]),
  );
}

describe("guessRefundOriginals", () => {
  it("prefers the same payee, then the exact amount and the nearer date", () => {
    const [guess] = guessRefundOriginals(
      [
        refund("r", {
          date: "2026-03-10",
          amountMinor: 2500,
          payeeId: "argos",
        }),
      ],
      [
        expense("other-shop", { date: "2026-03-09", amountMinor: -2500 }),
        expense("older", {
          date: "2026-01-10",
          amountMinor: -2500,
          payeeId: "argos",
        }),
        expense("bigger", {
          date: "2026-03-01",
          amountMinor: -9000,
          payeeId: "argos",
        }),
        expense("exact", {
          date: "2026-03-01",
          amountMinor: -2500,
          payeeId: "argos",
        }),
      ],
    );
    expect(guess.original?.id).toBe("exact");
    expect(guess.runnerUp?.id).toBe("older");
    expect(guess.categoryId).toBe("clothes");
  });

  it("matches a payee named in the note, ignoring refund words and case", () => {
    expect(
      originalsOf(
        [
          refund("r", {
            date: "2026-03-10",
            amountMinor: 1000,
            text: "TESCO refund",
          }),
        ],
        [
          expense("tesco", {
            date: "2026-03-02",
            amountMinor: -4000,
            text: "Tesco",
          }),
          expense("ocado", {
            date: "2026-03-09",
            amountMinor: -1000,
            text: "Ocado",
          }),
        ],
      ),
    ).toEqual({ r: "tesco" });
  });

  it("matches Chinese text by character pairs", () => {
    expect(
      originalsOf(
        [
          refund("r", {
            date: "2026-03-10",
            amountMinor: 1000,
            text: "火车票退款",
          }),
        ],
        [
          expense("train", {
            date: "2026-03-01",
            amountMinor: -3000,
            text: "火车",
          }),
        ],
      ),
    ).toEqual({ r: "train" });
  });

  it("skips an expense after the refund, too old, or smaller than the refund", () => {
    expect(
      originalsOf(
        [
          refund("r", {
            date: "2026-06-30",
            amountMinor: 5000,
            payeeId: "tfl",
          }),
        ],
        [
          expense("later", {
            date: "2026-07-01",
            amountMinor: -5000,
            payeeId: "tfl",
          }),
          expense("too-old", {
            date: "2025-12-01",
            amountMinor: -5000,
            payeeId: "tfl",
          }),
          expense("smaller", {
            date: "2026-06-29",
            amountMinor: -4999,
            payeeId: "tfl",
          }),
        ],
      ),
    ).toEqual({ r: null });
  });

  it("lets an expense absorb only what earlier refunds left of it", () => {
    expect(
      originalsOf(
        ["first", "second", "third"].map((id, index) =>
          refund(id, {
            date: `2026-03-1${String(index)}`,
            amountMinor: 3000,
            payeeId: "argos",
          }),
        ),
        [
          expense("order", {
            date: "2026-03-01",
            amountMinor: -8000,
            refundedMinor: 2000,
            payeeId: "argos",
          }),
        ],
      ),
    ).toEqual({ first: "order", second: "order", third: null });
  });

  it("needs an exact amount, on the account or within a month, when the refund names nothing", () => {
    expect(
      originalsOf(
        [
          refund("near", { date: "2026-03-10", amountMinor: 172 }),
          refund("far", {
            date: "2026-03-10",
            amountMinor: 999,
            accountId: "bank",
          }),
          refund("inexact", { date: "2026-03-10", amountMinor: 100 }),
        ],
        [
          expense("fare", {
            date: "2026-03-01",
            amountMinor: -172,
            accountId: "bank",
          }),
          expense("old", { date: "2026-01-01", amountMinor: -999 }),
          expense("bigger", { date: "2026-03-09", amountMinor: -500 }),
        ],
      ),
    ).toEqual({ near: "fare", far: null, inexact: null });
  });

  it("gives the same result whatever the input order", () => {
    const refunds = [
      refund("a", { date: "2026-03-10", amountMinor: 2000, payeeId: "argos" }),
      refund("b", { date: "2026-03-10", amountMinor: 2000, payeeId: "argos" }),
    ];
    const originals = [
      expense("x", {
        date: "2026-03-05",
        amountMinor: -2000,
        payeeId: "argos",
      }),
      expense("y", {
        date: "2026-03-05",
        amountMinor: -2000,
        payeeId: "argos",
      }),
    ];
    const forward = originalsOf(refunds, originals);
    expect(forward).toEqual({ a: "x", b: "y" });
    expect(
      originalsOf([...refunds].reverse(), [...originals].reverse()),
    ).toEqual(forward);
  });

  it("takes the category of the payee's history when no original is likely", () => {
    const [named, unnamed] = guessRefundOriginals(
      [
        refund("named", {
          date: "2026-03-10",
          amountMinor: 9000,
          text: "Deliveroo",
        }),
        refund("unnamed", { date: "2026-03-10", amountMinor: 9000 }),
      ],
      [
        expense("one", {
          date: "2026-03-01",
          amountMinor: -1500,
          text: "Deliveroo",
          categoryId: "takeaway",
        }),
        expense("two", {
          date: "2026-02-01",
          amountMinor: -1200,
          text: "deliveroo",
          categoryId: "takeaway",
        }),
        expense("three", {
          date: "2026-03-05",
          amountMinor: -1000,
          text: "Deliveroo",
          categoryId: "groceries",
        }),
      ],
    );
    expect(named).toMatchObject({ original: null, categoryId: "takeaway" });
    expect(unnamed).toMatchObject({ original: null, categoryId: null });
  });
});
