import { describe, expect, it } from "vitest";
import {
  COMPACTION_TRIGGER_TOKENS,
  CONTEXT_MANAGEMENT_CONFIG,
  USAGE_WARNING_RATIO,
} from "./context-management-shared";

const { edits } = CONTEXT_MANAGEMENT_CONFIG;

describe("CONTEXT_MANAGEMENT_CONFIG", () => {
  it("has exactly two edit strategies", () => {
    expect(edits).toHaveLength(2);
  });

  describe("tool result clearing (first edit)", () => {
    const clearing = edits[0];

    it("has the correct edit type", () => {
      expect(clearing.type).toBe("clear_tool_uses_20250919");
    });

    it("triggers at 80k input tokens", () => {
      expect(clearing.trigger).toEqual({
        type: "input_tokens",
        value: 80_000,
      });
    });

    it("keeps 3 recent tool uses", () => {
      expect(clearing.keep).toEqual({ type: "tool_uses", value: 3 });
    });

    it("clears at least 5000 tokens", () => {
      expect(clearing.clearAtLeast).toEqual({
        type: "input_tokens",
        value: 5_000,
      });
    });

    it("clears tool inputs", () => {
      expect(clearing.clearToolInputs).toBe(true);
    });

    it("excludes present_media from clearing", () => {
      expect(clearing.excludeTools).toEqual(["present_media"]);
    });
  });

  describe("auto-compaction (second edit)", () => {
    const compaction = edits[1];

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

  it("tool clearing triggers before compaction", () => {
    expect(edits[0].trigger.value).toBeLessThan(edits[1].trigger.value);
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
