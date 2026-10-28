import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-def-schema";
import { decodeCreature } from "./decode-creature";
import { encodeCreature } from "./encode-creature";

describe("decodeCreature", () => {
  it("returns null for non-base64 input", () => {
    expect(decodeCreature("!!!not-valid-base64$$$")).toBeNull();
  });

  it("returns null for a truncated encoded string", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    const truncated = encoded.slice(0, Math.max(1, encoded.length - 5));
    // Truncation may decode to invalid JSON or invalid schema — either way null.
    expect(decodeCreature(truncated)).toBeNull();
  });

  it("returns null for valid base64 of unrelated JSON", () => {
    const junk = btoa(JSON.stringify({ hello: "world" }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    expect(decodeCreature(junk)).toBeNull();
  });
});
