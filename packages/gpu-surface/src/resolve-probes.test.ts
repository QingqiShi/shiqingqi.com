import { describe, expect, it } from "vitest";
import { resolveProbes } from "./resolve-probes.ts";

const none = { large: 0, small: 0 };

describe("resolveProbes", () => {
  it("takes the probe heights where the browser has lvh and svh", () => {
    expect(
      resolveProbes(none, { large: 815, small: 775, innerHeight: 790 }),
    ).toEqual({ large: 815, small: 775 });
  });

  it("stands in the tallest and shortest inner height seen", () => {
    let probed = resolveProbes(none, { large: 0, small: 0, innerHeight: 790 });
    probed = resolveProbes(probed, { large: 0, small: 0, innerHeight: 815 });
    probed = resolveProbes(probed, { large: 0, small: 0, innerHeight: 775 });

    expect(probed).toEqual({ large: 815, small: 775 });
  });
});
