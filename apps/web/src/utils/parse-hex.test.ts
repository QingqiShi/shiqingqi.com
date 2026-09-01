import { describe, expect, it } from "vitest";
import { parseHex } from "./parse-hex";

describe("parseHex", () => {
  it("parses #rrggbb as fully opaque", () => {
    expect(parseHex("#ff8000")).toEqual([255, 128, 0, 255]);
  });

  it("parses #rrggbbaa including the alpha channel", () => {
    expect(parseHex("#ff800080")).toEqual([255, 128, 0, 128]);
  });

  it("accepts a value without the leading hash", () => {
    expect(parseHex("00ff00")).toEqual([0, 255, 0, 255]);
  });

  it("falls back to opaque black for an unsupported length", () => {
    expect(parseHex("#fff")).toEqual([0, 0, 0, 255]);
    expect(parseHex("")).toEqual([0, 0, 0, 255]);
  });
});
