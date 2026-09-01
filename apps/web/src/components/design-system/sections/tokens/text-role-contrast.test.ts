import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { compileStylexCss, readCustomProperty } from "@tuja/stylex-testing";
import { SYSTEM_PALETTE_TONES, systemPalette } from "@tuja/ui/palette-table";
import { color } from "@tuja/ui/tokens.stylex";
import { describe, expect, it } from "vitest";
import {
  BINDING_BACKGROUND,
  BODY_TEXT_FLOOR,
  contrastRatio,
  LARGE_TEXT_FLOOR,
  TEXT_ROLE_CONTRAST,
  TEXT_ROLE_TONES,
} from "./text-role-contrast.ts";

const require = createRequire(import.meta.url);
const tokensFile = require.resolve("@tuja/ui/tokens.stylex");
const hueDir = path.join(path.dirname(tokensFile), "_generated/palette/hues");
const css = compileStylexCss([
  tokensFile,
  ...fs
    .readdirSync(hueDir)
    .filter((file) => file.endsWith(".stylex.ts"))
    .map((file) => path.join(hueDir, file)),
]);

const gray = systemPalette.find((hue) => hue.name === "Gray");

/** The gray tone a compiled colour sits at, e.g. `"_13"`. */
function grayTone(hex: string): string {
  const tone = SYSTEM_PALETTE_TONES.find(
    (step) => gray?.tones[step].bg === hex,
  );
  return tone === undefined ? hex : `_${String(tone)}`;
}

/**
 * Assertions on the figures cannot catch a retoned role: they would recompute from
 * the stale mapping and still agree. Only the names can.
 */
describe("text role tone mapping matches tokens.stylex.ts", () => {
  it.each([...TEXT_ROLE_TONES])(
    "$role resolves to the tones $light.text / $dark.text",
    (role) => {
      const value = readCustomProperty(css, color[role.role]);
      for (const theme of ["light", "dark"] as const) {
        expect(
          grayTone(value[theme]),
          `tokens.stylex.ts no longer maps ${theme} '${role.role}' to gray.${role[theme].text}. ` +
            `Update TEXT_ROLE_TONES in text-role-contrast.ts to the new tone, then re-read the ` +
            `Contrast copy in accessibility-showcase.tsx — the prose describes where these ratios ` +
            `sit relative to the WCAG floors, and moving a tone can make it false.`,
        ).toBe(role[theme].text);
      }
    },
  );

  it.each(["light", "dark"] as const)(
    "%s quotes the background role it measures against",
    (theme) => {
      const background = BINDING_BACKGROUND[theme];
      // One background tone per theme, asserted below, so the first entry speaks
      // for all three.
      const [firstRole] = TEXT_ROLE_TONES;
      const tone = firstRole[theme].background;
      expect(
        grayTone(readCustomProperty(css, color[background])[theme]),
        `tokens.stylex.ts no longer maps ${theme} '${background}' to gray.${tone}. ` +
          `The page labels each figure with this background by name, so update both ` +
          `TEXT_ROLE_TONES and the labels in accessibility-showcase.tsx.`,
      ).toBe(tone);
    },
  );

  it("uses one background per theme across every role", () => {
    // The page prints one background label per column.
    for (const theme of ["light", "dark"] as const) {
      const backgrounds = new Set(
        TEXT_ROLE_TONES.map((role) => role[theme].background),
      );
      expect(backgrounds.size).toBe(1);
    }
  });
});

/**
 * Asserts the claims the page makes in prose, not the digits. On failure, fix the
 * Contrast copy in `accessibility-showcase.tsx`.
 */
describe("text role contrast", () => {
  it("computes a ratio against known values", () => {
    // Black on white is WCAG's maximum, 21:1.
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 2);
    expect(contrastRatio("#FFFFFF", "#FFFFFF")).toBeCloseTo(1, 5);
  });

  it("covers every role the page documents", () => {
    expect(TEXT_ROLE_CONTRAST.map((role) => role.token)).toEqual([
      "color.textMain",
      "color.textMuted",
      "color.textSubtle",
    ]);
  });

  // Claim 1: "all three clear the body floor in both themes", which is what
  // makes the choice between them a question of rank rather than compliance.
  it.each([...TEXT_ROLE_CONTRAST])(
    "$token clears both floors in both themes",
    (role) => {
      for (const floor of [BODY_TEXT_FLOOR, LARGE_TEXT_FLOOR]) {
        expect(role.lightRatio).toBeGreaterThanOrEqual(floor);
        expect(role.darkRatio).toBeGreaterThanOrEqual(floor);
      }
    },
  );

  // Claim 2: textSubtle is "the quietest thing that is still fully readable",
  // which only holds while the three roles descend in the order the page lists.
  it.each(["light", "dark"] as const)("descends by role in %s", (theme) => {
    const key = theme === "light" ? "lightRatio" : "darkRatio";
    const ratios = TEXT_ROLE_CONTRAST.map((role) => role[key]);
    expect(ratios).toEqual([...ratios].sort((a, b) => b - a));
    expect(new Set(ratios).size).toBe(ratios.length);
  });

  it("formats ratios for display", () => {
    for (const role of TEXT_ROLE_CONTRAST) {
      expect(role.light).toMatch(/^\d+\.\d{2}:1$/);
      expect(role.dark).toMatch(/^\d+\.\d{2}:1$/);
    }
  });
});
