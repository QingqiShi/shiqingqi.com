import { TOKEN_KINDS as PLUGIN_KINDS } from "@tuja/babel-plugins/specimen-source/token-kinds";
import { describe, expect, it } from "vitest";
import { TOKEN_KINDS } from "./token-kinds.ts";

// The seam with the Babel plugin. A kind added on one side and not the other
// paints as nothing, so the two lists are compared here.

describe("TOKEN_KINDS", () => {
  it("agrees with the Babel plugin", () => {
    expect([...TOKEN_KINDS]).toEqual([...PLUGIN_KINDS]);
  });
});
