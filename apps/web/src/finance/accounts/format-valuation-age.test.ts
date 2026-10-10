import { describe, expect, it } from "vitest";
import { formatValuationAge } from "./format-valuation-age.ts";

describe("formatValuationAge", () => {
  it("says how many days ago a recent balance was set", () => {
    expect(formatValuationAge("2026-10-10", "2026-10-10", "en")).toBe("today");
    expect(formatValuationAge("2026-10-09", "2026-10-10", "en")).toBe(
      "yesterday",
    );
    expect(formatValuationAge("2026-10-07", "2026-10-10", "en")).toBe(
      "3 days ago",
    );
    expect(formatValuationAge("2026-10-07", "2026-10-10", "zh")).toBe("3天前");
  });

  it("gives the day for an older balance", () => {
    expect(formatValuationAge("2026-04-02", "2026-10-10", "en")).toBe("2 Apr");
    expect(formatValuationAge("2025-04-02", "2026-10-10", "en")).toBe(
      "2 Apr 2025",
    );
  });
});
