import { describe, expect, it } from "vitest";
import { firstSentence } from "./first-sentence.ts";

describe("firstSentence", () => {
  it("ends an English summary at a full stop before a capital", () => {
    expect(
      firstSentence(
        "Id applied to the label span, e.g. to wire `x`. Pass `a.B` too.",
      ),
    ).toBe("Id applied to the label span, e.g. to wire `x`.");
  });

  it("ends a Chinese summary at the first 。 outside code", () => {
    expect(firstSentence("设定 `a。b` 的值。其余说明。")).toBe(
      "设定 `a。b` 的值。",
    );
  });

  it("keeps a summary with no stop whole, and only its first paragraph", () => {
    expect(firstSentence("Visual look\n\nMore.")).toBe("Visual look");
  });
});
