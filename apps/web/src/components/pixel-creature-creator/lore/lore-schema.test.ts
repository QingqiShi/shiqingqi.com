import { describe, expect, it } from "vitest";
import { loreOutputSchema, TYPE_OPTIONS } from "./lore-schema";

describe("loreOutputSchema", () => {
  const valid = {
    nameSuggestion: "Sproutling",
    loreEn: "A gentle sprout that hums when the sun rises.",
    loreZh: "黎明时分会哼歌的小芽。",
    type: "leaf",
  };

  it("parses a valid lore object", () => {
    const result = loreOutputSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it("accepts every type listed in TYPE_OPTIONS", () => {
    for (const type of TYPE_OPTIONS) {
      const result = loreOutputSchema.safeParse({ ...valid, type });
      expect(result.success, `expected type "${type}" to parse`).toBe(true);
    }
  });

  it("rejects an overlong nameSuggestion", () => {
    const result = loreOutputSchema.safeParse({
      ...valid,
      // 21 chars — one past the cap.
      nameSuggestion: "Sproutlingsproutlinger",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an unknown type", () => {
    const result = loreOutputSchema.safeParse({ ...valid, type: "psychic" });
    expect(result.success).toBe(false);
  });

  it("rejects empty English lore", () => {
    const result = loreOutputSchema.safeParse({ ...valid, loreEn: "" });
    expect(result.success).toBe(false);
  });

  it("rejects empty Chinese lore", () => {
    const result = loreOutputSchema.safeParse({ ...valid, loreZh: "" });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong English lore string", () => {
    const result = loreOutputSchema.safeParse({
      ...valid,
      loreEn: "x".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("rejects an overlong Chinese lore string", () => {
    const result = loreOutputSchema.safeParse({
      ...valid,
      loreZh: "啊".repeat(121),
    });
    expect(result.success).toBe(false);
  });
});
