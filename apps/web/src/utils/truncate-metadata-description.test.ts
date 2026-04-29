import { describe, expect, it } from "vitest";
import { truncateMetadataDescription } from "./truncate-metadata-description";

describe("truncateMetadataDescription", () => {
  it("returns undefined when the input is null", () => {
    expect(truncateMetadataDescription(null, "en", 200)).toBeUndefined();
  });

  it("returns undefined when the input is undefined", () => {
    expect(truncateMetadataDescription(undefined, "en", 200)).toBeUndefined();
  });

  it("returns the original string when it already fits within the cap", () => {
    const text = "A short description.";
    expect(truncateMetadataDescription(text, "en", 200)).toBe(text);
  });

  it("does not append an ellipsis when the original ends with sentence punctuation and fits", () => {
    const text = "Inception is a heist movie set inside dreams.";
    expect(truncateMetadataDescription(text, "en", 200)).toBe(text);
  });

  it("truncates to the cap and appends a single ellipsis character", () => {
    // 250 chars long, fits 200 cap.
    const text =
      "Cobb is a skilled thief, the absolute best in the dangerous art of extraction, stealing valuable secrets from deep within the subconscious during the dream state when the mind is at its most vulnerable. " +
      "He works alone for now.";
    const result = truncateMetadataDescription(text, "en", 200);
    if (!result) throw new Error("expected truncated string");
    expect(result.length).toBeLessThanOrEqual(200);
    expect(result.endsWith("…")).toBe(true);
    // Single U+2026, not three periods.
    expect(result.endsWith("...")).toBe(false);
  });

  it("truncates at a word boundary in en so the trailing token is a complete word", () => {
    const text =
      "Cobb is a skilled thief stealing valuable secrets from deep within the subconscious during the dream state when the mind is at its most vulnerable beyond the boundaries of the cap.";
    const result = truncateMetadataDescription(text, "en", 100);
    if (!result) throw new Error("expected truncated string");
    expect(result.length).toBeLessThanOrEqual(100);
    // The character right before the ellipsis must be a letter, not a
    // space or partial word.
    const beforeEllipsis = result.slice(0, -1);
    expect(beforeEllipsis).not.toMatch(/\s$/);
    // No trailing punctuation hanging before the ellipsis.
    expect(beforeEllipsis).not.toMatch(/[,;:.!?—–-]$/);
  });

  it("strips trailing punctuation before appending the ellipsis in en", () => {
    const text =
      "Cobb works alone for now, but he is about to be offered the chance for one last job that could erase his criminal history forever.";
    const result = truncateMetadataDescription(text, "en", 80);
    if (!result) throw new Error("expected truncated string");
    expect(result.endsWith(",…")).toBe(false);
    expect(result.endsWith(" …")).toBe(false);
    expect(result.endsWith("…")).toBe(true);
  });

  it("truncates by character count for zh since there are no whitespace word boundaries", () => {
    // 100 zh characters of free-form description.
    const text =
      "柯布是一名技术高超的盗贼，盗窃的不是物品而是潜入睡梦中人的潜意识深处提取最有价值的秘密信息，他独自工作，正在被提供一个可以彻底抹去他犯罪历史的最后机会，但他必须先完成一项看似不可能的任务";
    const result = truncateMetadataDescription(text, "zh", 50);
    if (!result) throw new Error("expected truncated string");
    expect(result.length).toBeLessThanOrEqual(50);
    expect(result.endsWith("…")).toBe(true);
    // Word-boundary regex would never match — confirm we still got a result.
    expect(result.length).toBeGreaterThan(1);
  });

  it("falls back to a character cut for en when the input has no whitespace", () => {
    // Edge case: a single very long token with no spaces.
    const text = "a".repeat(300);
    const result = truncateMetadataDescription(text, "en", 100);
    if (!result) throw new Error("expected truncated string");
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith("…")).toBe(true);
  });
});
