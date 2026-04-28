import { describe, expect, it } from "vitest";
import {
  COMPACTION_TRIGGER_TOKENS,
  CONTEXT_MANAGEMENT_CONFIG,
  USAGE_WARNING_RATIO,
} from "./context-management-shared";

const { edits } = CONTEXT_MANAGEMENT_CONFIG;

describe("CONTEXT_MANAGEMENT_CONFIG", () => {
  it("has exactly one edit strategy", () => {
    expect(edits).toHaveLength(1);
  });

  describe("auto-compaction", () => {
    const compaction = edits[0];

    it("has the correct edit type", () => {
      expect(compaction.type).toBe("compact_20260112");
    });

    it("triggers at the shared compaction threshold", () => {
      expect(compaction.trigger).toEqual({
        type: "input_tokens",
        value: COMPACTION_TRIGGER_TOKENS,
      });
    });

    it("does not pause after compaction", () => {
      expect(compaction.pauseAfterCompaction).toBe(false);
    });

    it("includes domain-specific compaction instructions", () => {
      expect(compaction.instructions).toContain("movie/TV");
      expect(compaction.instructions).toContain("titles with release years");
      expect(compaction.instructions).toContain("preference signals");
    });
  });
});

describe("shared constants", () => {
  it("COMPACTION_TRIGGER_TOKENS is 100k", () => {
    expect(COMPACTION_TRIGGER_TOKENS).toBe(100_000);
  });

  it("USAGE_WARNING_RATIO is 0.6", () => {
    expect(USAGE_WARNING_RATIO).toBe(0.6);
  });
});
