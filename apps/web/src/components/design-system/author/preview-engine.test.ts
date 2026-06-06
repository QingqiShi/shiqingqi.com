import { describe, expect, it } from "vitest";
import { parseLength, parseVarName } from "./preview-engine.ts";

describe("parseVarName", () => {
  it("extracts the custom property name", () => {
    expect(parseVarName("var(--color-textMain-x1a2)")).toBe(
      "--color-textMain-x1a2",
    );
  });

  it("tolerates whitespace", () => {
    expect(parseVarName("var( --x )")).toBe("--x");
  });

  it("returns null for non-var references", () => {
    expect(parseVarName("#fff")).toBeNull();
    expect(parseVarName("1rem")).toBeNull();
    expect(parseVarName("")).toBeNull();
  });
});

describe("parseLength", () => {
  it("splits value and unit", () => {
    expect(parseLength("1.25rem", "rem")).toEqual({
      value: "1.25",
      unit: "rem",
    });
    expect(parseLength("2px", "rem")).toEqual({ value: "2", unit: "px" });
  });

  it("uses the fallback unit when none is present", () => {
    expect(parseLength("0", "em")).toEqual({ value: "0", unit: "em" });
  });

  it("handles leading-dot decimals", () => {
    expect(parseLength(".5rem", "rem")).toEqual({ value: ".5", unit: "rem" });
  });
});
