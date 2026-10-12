import { describe, expect, it } from "vitest";
import { accountFullName } from "./account-full-name.ts";

describe("accountFullName", () => {
  it("puts the owner and institution before the name", () => {
    expect(
      accountFullName(
        { name: "Current Account", institution: "Natwest" },
        "老婆",
      ),
    ).toBe("老婆 Natwest Current Account");
  });

  it("leaves out parts that are empty or that the name holds", () => {
    expect(
      accountFullName(
        { name: "Natwest Savings", institution: "NatWest" },
        null,
      ),
    ).toBe("Natwest Savings");
    expect(
      accountFullName({ name: "Alex Visa", institution: " " }, "Alex"),
    ).toBe("Alex Visa");
  });
});
