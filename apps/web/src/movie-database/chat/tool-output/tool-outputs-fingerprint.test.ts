import type { UIMessage } from "ai";
import { describe, expect, it } from "vitest";
import { toolOutputsFingerprint } from "./tool-outputs-fingerprint";

function msg(
  parts: UIMessage["parts"],
  role: "user" | "assistant" = "assistant",
): UIMessage {
  return { id: `msg-${String(Math.random())}`, role, parts };
}

describe("toolOutputsFingerprint", () => {
  function outputPart(toolCallId: string) {
    return {
      type: "dynamic-tool" as const,
      toolName: "tmdb_search",
      toolCallId,
      state: "output-available" as const,
      input: {},
      output: [],
    };
  }
  function pendingPart<S extends "input-streaming" | "input-available">(
    toolCallId: string,
    state: S,
  ) {
    return {
      type: "dynamic-tool" as const,
      toolName: "tmdb_search",
      toolCallId,
      state,
      input: {},
    };
  }

  it("returns empty string for no messages", () => {
    expect(toolOutputsFingerprint([])).toBe("");
  });

  it("ignores parts that are not resolved tool outputs", () => {
    const messages = [
      msg([
        { type: "text", text: "hello" },
        pendingPart("a", "input-streaming"),
        pendingPart("b", "input-available"),
      ]),
    ];
    expect(toolOutputsFingerprint(messages)).toBe("");
  });

  it("stays stable when only non-tool parts change (streaming text chunks)", () => {
    const toolParts = [outputPart("call-1")];
    const before = [msg([...toolParts, { type: "text", text: "partial" }])];
    const after = [
      msg([...toolParts, { type: "text", text: "partial growing" }]),
    ];
    expect(toolOutputsFingerprint(before)).toBe(toolOutputsFingerprint(after));
  });

  it("changes when a new tool output is appended", () => {
    const first = [msg([outputPart("call-1")])];
    const second = [msg([outputPart("call-1"), outputPart("call-2")])];
    expect(toolOutputsFingerprint(first)).not.toBe(
      toolOutputsFingerprint(second),
    );
  });

  it("differs between two conversations with the same output count (session switch)", () => {
    const sessionA = [msg([outputPart("a-1"), outputPart("a-2")])];
    const sessionB = [msg([outputPart("b-1"), outputPart("b-2")])];
    expect(toolOutputsFingerprint(sessionA)).not.toBe(
      toolOutputsFingerprint(sessionB),
    );
  });
});
