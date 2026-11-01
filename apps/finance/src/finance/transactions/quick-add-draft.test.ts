import { describe, expect, it } from "vitest";
import { amountTextFor } from "./quick-add-draft.ts";

describe("amountTextFor", () => {
  it("keeps the number the text wrote in the account's minor units", () => {
    expect(amountTextFor(1_250, "GBP", "USD")).toBe("12.50");
    expect(amountTextFor(120_000, "GBP", "JPY")).toBe("1200");
    expect(amountTextFor(1_200, "JPY", "GBP")).toBe("1200.00");
  });

  it("keeps decimals the account's currency cannot hold, for the editor to refuse", () => {
    expect(amountTextFor(1_250, "GBP", "JPY")).toBe("12.50");
  });
});
