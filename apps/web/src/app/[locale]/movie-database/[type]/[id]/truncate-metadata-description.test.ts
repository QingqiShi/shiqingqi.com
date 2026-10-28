import { describe, expect, it } from "vitest";
import { truncateMetadataDescription } from "./truncate-metadata-description";

describe("truncateMetadataDescription", () => {
  it("returns the original string when it already fits within the cap", () => {
    const text = "A short description.";
    expect(truncateMetadataDescription(text, "en", 200)).toBe(text);
  });

  it("truncates at a word boundary in en so the trailing token is a complete word", () => {
    const text =
      "Cobb is a skilled thief stealing valuable secrets from deep within the subconscious during the dream state when the mind is at its most vulnerable beyond the boundaries of the cap.";
    const result = truncateMetadataDescription(text, "en", 100);
    if (!result) throw new Error("expected truncated string");
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.endsWith("…")).toBe(true);
    const beforeEllipsis = result.slice(0, -1);
    expect(beforeEllipsis).not.toMatch(/\s$/);
    expect(text.startsWith(beforeEllipsis)).toBe(true);
  });

  it("does not split a surrogate pair when the cap lands inside an emoji", () => {
    // "🎬" is U+1F3AC (length 2 as UTF-16). Pad with ASCII so the cap
    // would otherwise land between the high and low surrogate.
    const text = `${"a".repeat(98)}🎬 the rest of the description`;
    const result = truncateMetadataDescription(text, "en", 100);
    if (!result) throw new Error("expected truncated string");
    expect(result.length).toBeLessThanOrEqual(100);
    const beforeEllipsis = result.slice(0, -1);
    const lastCharCode = beforeEllipsis.charCodeAt(beforeEllipsis.length - 1);
    const isHighSurrogate = lastCharCode >= 0xd800 && lastCharCode <= 0xdbff;
    expect(isHighSurrogate).toBe(false);
  });
});
