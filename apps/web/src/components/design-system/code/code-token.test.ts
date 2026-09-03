import { TOKEN_KINDS as PLUGIN_KINDS } from "@tuja/babel-plugins/specimen-source/token-kinds";
import { describe, expect, it } from "vitest";
import { TOKEN_KINDS } from "./code-token.ts";

// The seam with the Babel plugin. A kind added on one side and not the other
// paints as nothing, so the two lists are compared here, and spelled out as
// well to make each change deliberate.

describe("TOKEN_KINDS", () => {
  it("agrees with the Babel plugin", () => {
    expect([...TOKEN_KINDS]).toEqual([...PLUGIN_KINDS]);
  });

  it("holds the agreed kinds", () => {
    expect([...TOKEN_KINDS]).toEqual([
      "plain",
      "keyword",
      "string",
      "comment",
      "number",
      "tag",
      "component",
      "attr",
      "property",
      "punct",
    ]);
  });

  it("names each kind once", () => {
    expect(new Set(TOKEN_KINDS).size).toBe(TOKEN_KINDS.length);
  });
});
