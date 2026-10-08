import { describe, expect, it } from "vitest";
import { atomicClasses } from "../test-support/atomic-classes.ts";

describe("touch target copies", () => {
  const target = atomicClasses(
    "primitives/a11y.stylex.ts",
    "a11y",
    "touchTarget",
  );

  it("reads the a11y touch target", () => {
    // Four declarations on the control and four on its `::after`.
    expect(target.size).toBe(8);
  });

  it.each([
    ["primitives/reset.stylex.ts", "buttonReset", "base", 8],
    ["actions/chip.stylex.ts", "chipSurface", "interactive", 8],
    // A card takes the tap highlight and `touch-action`, but no hit area.
    ["surfaces/card.stylex.ts", "cardSurface", "interactive", 2],
  ])(
    "%s %s.%s carries %i touch target declarations unchanged",
    (file, namespace, style, count) => {
      const classes = atomicClasses(file, namespace, style);
      const shared = [...target].filter(([property]) => classes.has(property));
      expect(shared).toHaveLength(count);
      for (const [property, className] of shared) {
        expect(classes.get(property)).toBe(className);
      }
    },
  );
});
