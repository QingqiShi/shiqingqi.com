import { describe, expect, it } from "vitest";
import { getChatSystemInstructions } from "./system-instructions";

describe("getChatSystemInstructions", () => {
  it("returns a string containing the current date for en locale", () => {
    const instructions = getChatSystemInstructions("en");
    const currentDate = new Date().toISOString().split("T")[0];

    expect(instructions).toContain(currentDate);
  });

  it("returns a string containing zh as locale", () => {
    const instructions = getChatSystemInstructions("zh");

    expect(instructions).toContain("zh");
  });

  it("has no unreplaced placeholders", () => {
    const instructions = getChatSystemInstructions("en");

    expect(instructions).not.toContain("{currentDate}");
    expect(instructions).not.toContain("{locale}");
  });

  it("contains expected key phrases", () => {
    const instructions = getChatSystemInstructions("en");

    expect(instructions).toContain("movie");
    expect(instructions).toContain("recommendation");
  });
});
