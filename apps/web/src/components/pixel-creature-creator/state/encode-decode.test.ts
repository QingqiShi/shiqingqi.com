import { describe, expect, it } from "vitest";
import { DEFAULT_CREATURE } from "./creature-schema";
import { decodeCreature, encodeCreature } from "./encode-decode";

describe("encodeCreature / decodeCreature", () => {
  it("round-trips the default creature exactly", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    const decoded = decodeCreature(encoded);
    expect(decoded).toEqual(DEFAULT_CREATURE);
  });

  it("produces a short string for the default creature", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    expect(encoded.length).toBeLessThanOrEqual(80);
  });

  it("round-trips with non-empty accessories and a custom name", () => {
    const def = {
      ...DEFAULT_CREATURE,
      accessories: ["bow", "scarf"],
      name: "Mochi",
    };
    const encoded = encodeCreature(def);
    expect(decodeCreature(encoded)).toEqual(def);
  });

  it("round-trips a non-ASCII name", () => {
    const def = { ...DEFAULT_CREATURE, name: "团子" };
    expect(decodeCreature(encodeCreature(def))).toEqual(def);
  });

  it("returns null for empty input", () => {
    expect(decodeCreature("")).toBeNull();
  });

  it("returns null for non-base64 input", () => {
    expect(decodeCreature("!!!not-valid-base64$$$")).toBeNull();
  });

  it("returns null for a truncated encoded string", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    const truncated = encoded.slice(0, Math.max(1, encoded.length - 5));
    // Truncation may decode to invalid JSON or invalid schema — either way null.
    expect(decodeCreature(truncated)).toBeNull();
  });

  it("returns null when whitespace is mixed into otherwise-valid input", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    const withSpace = `${encoded.slice(0, 4)} ${encoded.slice(4)}`;
    expect(decodeCreature(withSpace)).toBeNull();
  });

  it("returns null for non-alphabet characters", () => {
    const encoded = encodeCreature(DEFAULT_CREATURE);
    // `*` is outside the base64url alphabet — `atob` would tolerate it,
    // but the decoder should reject it before that.
    const tampered = `${encoded.slice(0, -1)}*`;
    expect(decodeCreature(tampered)).toBeNull();
  });

  it("returns null for valid base64 of unrelated JSON", () => {
    const junk = btoa(JSON.stringify({ hello: "world" }))
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    expect(decodeCreature(junk)).toBeNull();
  });

  it("returns null for v:1 share URLs (legacy multi-axis format)", () => {
    // Hand-crafted v:1 compact tuple of length 9, base64url-encoded the
    // same way the old encoder would have produced it.
    const legacyTuple = [
      1,
      "blob-a",
      "round-a",
      "dot",
      [],
      "spring",
      "leaf",
      "idle",
      "",
    ];
    const json = JSON.stringify(legacyTuple);
    const bytes = new TextEncoder().encode(json);
    let binary = "";
    for (const b of bytes) binary += String.fromCharCode(b);
    const encoded = btoa(binary)
      .replaceAll("+", "-")
      .replaceAll("/", "_")
      .replaceAll("=", "");
    expect(decodeCreature(encoded)).toBeNull();
  });
});
