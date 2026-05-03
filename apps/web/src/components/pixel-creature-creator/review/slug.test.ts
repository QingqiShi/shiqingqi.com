import { describe, expect, it } from "vitest";
import { SLUG_FALLBACK, slugifyName } from "./slug";

describe("slugifyName", () => {
  it("lowercases ASCII letters", () => {
    expect(slugifyName("Mochi")).toBe("mochi");
  });

  it("replaces spaces with single hyphens", () => {
    expect(slugifyName("Tiny Mochi")).toBe("tiny-mochi");
  });

  it("collapses runs of punctuation into a single hyphen", () => {
    expect(slugifyName("Mochi!!!  the---great")).toBe("mochi-the-great");
  });

  it("strips leading and trailing hyphens", () => {
    expect(slugifyName("---hello---")).toBe("hello");
  });

  it("keeps digits", () => {
    expect(slugifyName("Mochi 2")).toBe("mochi-2");
  });

  it("falls back when the input is empty", () => {
    expect(slugifyName("")).toBe(SLUG_FALLBACK);
  });

  it("falls back when the input has no slug-safe characters", () => {
    expect(slugifyName("团子")).toBe(SLUG_FALLBACK);
    expect(slugifyName("!!!")).toBe(SLUG_FALLBACK);
  });
});
