import { beforeAll, describe, expect, it } from "vitest";
import { buildAdapter } from "./index.mjs";

describe("buildAdapter", () => {
  // Compiling the whole design system is the expensive part, so it happens
  // once and both tests below read the same result.
  let adapter;

  beforeAll(() => {
    adapter = buildAdapter();
  });

  it("compiles CSS carrying a resolved token var and the Inter @font-face", () => {
    expect(adapter.css).toContain("var(--");
    expect(adapter.css).toMatch(/@font-face/);
    expect(adapter.css).toMatch(/Inter/);
  });

  it("builds a catalogue with the groups the pickers need", () => {
    for (const group of [
      "color",
      "space",
      "controlSize",
      "font",
      "border",
      "layer",
      "opacity",
      "ratio",
    ]) {
      expect(adapter.catalogue.groups[group]).toBeDefined();
      expect(adapter.catalogue.groups[group].tokens.length).toBeGreaterThan(0);
    }
  });
});
