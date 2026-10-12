import { describe, expect, it } from "vitest";
import { isBusinessDay, toBusinessDay } from "./to-business-day.ts";

describe("isBusinessDay", () => {
  it("is false on a weekend and on a bank holiday", () => {
    expect(isBusinessDay("2026-10-12")).toBe(true);
    expect(isBusinessDay("2026-10-10")).toBe(false);
    expect(isBusinessDay("2026-10-11")).toBe(false);
    expect(isBusinessDay("2026-04-06")).toBe(false);
    expect(isBusinessDay("2026-12-28")).toBe(false);
  });
});

describe("toBusinessDay", () => {
  it("keeps every day when the Rule stays", () => {
    expect(toBusinessDay("2026-11-01", "stay")).toBe("2026-11-01");
  });

  it("keeps a business day in both directions", () => {
    expect(toBusinessDay("2026-10-12", "next")).toBe("2026-10-12");
    expect(toBusinessDay("2026-10-12", "previous")).toBe("2026-10-12");
  });

  it("moves across a weekend", () => {
    expect(toBusinessDay("2026-11-01", "next")).toBe("2026-11-02");
    expect(toBusinessDay("2026-10-25", "previous")).toBe("2026-10-23");
  });

  it("moves across Easter", () => {
    expect(toBusinessDay("2026-04-03", "next")).toBe("2026-04-07");
    expect(toBusinessDay("2026-04-06", "previous")).toBe("2026-04-02");
  });

  it("moves across Christmas and its substitute day", () => {
    expect(toBusinessDay("2026-12-25", "next")).toBe("2026-12-29");
    expect(toBusinessDay("2026-12-28", "previous")).toBe("2026-12-24");
  });

  it("moves across a year end", () => {
    expect(toBusinessDay("2027-12-25", "next")).toBe("2027-12-29");
    expect(toBusinessDay("2028-01-01", "previous")).toBe("2027-12-31");
    expect(toBusinessDay("2022-01-01", "next")).toBe("2022-01-04");
  });
});
