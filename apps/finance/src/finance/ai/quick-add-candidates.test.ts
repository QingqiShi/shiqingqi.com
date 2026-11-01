import { describe, expect, it } from "vitest";
import { quickAddCandidates } from "./quick-add-candidates.ts";

const TODAY = "2026-11-01";

describe("quickAddCandidates", () => {
  it("offers every amount of a bank message, but not its dates, times or words around them", () => {
    const candidates = quickAddCandidates(
      "【招商银行】您账户1234于10月31日14:23在星巴克消费35.00元，余额1,234.56元",
      "GBP",
      TODAY,
    );

    expect(candidates.amounts).toEqual([
      { written: "1234", amountMinor: 123400 },
      { written: "35.00", amountMinor: 3500 },
      { written: "1,234.56", amountMinor: 123456 },
    ]);
    expect(candidates.dates).toEqual([
      { date: TODAY, written: null },
      { date: "2026-10-31", written: "10月31日" },
    ]);
    expect(candidates.payeeNames).toContain("招商银行");
    expect(candidates.payeeNames.join()).not.toMatch(/\d/);
  });

  it("puts a day without a year in the latest year that is not more than a month ahead", () => {
    expect(
      quickAddCandidates("12月25日 礼物 200", "GBP", TODAY).dates[1].date,
    ).toBe("2025-12-25");
    expect(
      quickAddCandidates("rent 20 Nov 900", "GBP", TODAY).dates[1].date,
    ).toBe("2026-11-20");
  });

  it("offers both readings of a day and month written with a slash, when both are days", () => {
    expect(
      quickAddCandidates("pret 3/10 4.20", "GBP", TODAY).dates.map(
        (each) => each.date,
      ),
    ).toEqual([TODAY, "2026-10-03", "2026-03-10"]);
    const endOfSentence = quickAddCandidates(
      "Spent £35.00 on 30/10.",
      "GBP",
      TODAY,
    );
    expect(endOfSentence.dates.map((each) => each.date)).toEqual([
      TODAY,
      "2026-10-30",
    ]);
    expect(endOfSentence.amounts.map((each) => each.amountMinor)).toEqual([
      3500,
    ]);
  });

  it("reads a relative day and leaves its word out of Payee names", () => {
    const candidates = quickAddCandidates("昨天打车32", "GBP", TODAY);

    expect(candidates.dates).toEqual([
      { date: TODAY, written: null },
      { date: "2026-10-31", written: "昨天" },
    ]);
    expect(candidates.amounts).toEqual([{ written: "32", amountMinor: 3200 }]);
    expect(candidates.payeeNames).toEqual(["打车"]);
  });
});
