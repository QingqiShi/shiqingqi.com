import { describe, expect, it } from "vitest";
import { atomicClasses } from "../test-support/atomic-classes.ts";

describe("focus ring copies", () => {
  const a11y = "primitives/a11y.stylex.ts";
  const outer = atomicClasses(a11y, "a11y", "focusRing");
  const inset = atomicClasses(a11y, "a11y", "focusRingInset");

  it("reads the a11y rings", () => {
    expect(outer.size).toBe(4);
    expect(inset.size).toBe(4);
  });

  it.each([
    ["primitives/reset.stylex.ts", "buttonReset", "base", outer],
    ["actions/chip.stylex.ts", "chipSurface", "interactive", outer],
    ["surfaces/card.stylex.ts", "cardSurface", "interactive", inset],
  ])(
    "%s %s.%s carries the a11y ring unchanged",
    (file, namespace, style, ring) => {
      const classes = atomicClasses(file, namespace, style);
      for (const [property, className] of ring) {
        expect(classes.get(property)).toBe(className);
      }
    },
  );
});
