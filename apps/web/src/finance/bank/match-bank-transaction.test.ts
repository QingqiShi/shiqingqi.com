import { describe, expect, it } from "vitest";
import {
  matchBankTransaction,
  type MatchCandidate,
} from "./match-bank-transaction.ts";

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

const bank = { date: "2026-10-05", amountMinor: -1000 };

describe("matchBankTransaction", () => {
  it("creates when nothing has the same signed amount within three days", () => {
    expect(
      matchBankTransaction(bank, [
        candidate("other-amount", { amountMinor: -1001 }),
        candidate("other-sign", { amountMinor: 1000 }),
        candidate("too-early", { date: "2026-10-01" }),
        candidate("too-late", { date: "2026-10-09" }),
      ]),
    ).toEqual({ action: "create" });
  });

  it("confirms an Expected Transaction before it links a posted one", () => {
    expect(
      matchBankTransaction(bank, [
        candidate("posted"),
        candidate("expected", { status: "expected", date: "2026-10-08" }),
      ]),
    ).toEqual({ action: "confirm", transactionId: "expected" });
  });

  it("links the nearest date, then the earliest created", () => {
    expect(
      matchBankTransaction(bank, [
        candidate("far", { date: "2026-10-03" }),
        candidate("late", { createdAt: new Date("2026-10-05T12:00:00Z") }),
        candidate("early", { createdAt: new Date("2026-10-05T08:00:00Z") }),
      ]),
    ).toEqual({ action: "link", transactionId: "early" });
  });
});
