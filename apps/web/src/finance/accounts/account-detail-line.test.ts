import { describe, expect, it } from "vitest";
import { accountDetailLine } from "./account-detail-line.ts";

describe("accountDetailLine", () => {
  it("joins the owner and institution", () => {
    expect(
      accountDetailLine({ name: "Savings", institution: "Monzo" }, "Alex"),
    ).toBe("Alex · Monzo");
  });

  it("leaves out parts that are empty or that the name holds", () => {
    expect(
      accountDetailLine(
        { name: "Natwest Savings", institution: "NatWest" },
        null,
      ),
    ).toBe("");
    expect(
      accountDetailLine({ name: "Alex Visa", institution: "Amex" }, "Alex"),
    ).toBe("Amex");
  });
});
