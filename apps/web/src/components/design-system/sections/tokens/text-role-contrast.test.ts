import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  BINDING_BACKGROUND,
  BODY_TEXT_FLOOR,
  contrastRatio,
  LARGE_TEXT_FLOOR,
  TEXT_ROLE_CONTRAST,
  TEXT_ROLE_TONES,
} from "./text-role-contrast.ts";

// Read as source: the mapping lives in module-private `light` / `dark` objects
// that a `.stylex.ts` file may not export.
const here = path.dirname(fileURLToPath(import.meta.url));
const tokensSource = readFileSync(
  path.resolve(here, "../../../../../../../packages/ui/src/tokens.stylex.ts"),
  "utf8",
);

/** The body of `const light = { … }` or its `dark` equivalent. */
function themeBlock(theme: "light" | "dark"): string {
  // `dark` carries a type annotation between the name and the brace.
  const pattern = new RegExp(
    `^const ${theme}[^=]*= \\{$([\\s\\S]*?)^\\};$`,
    "m",
  );
  const match = pattern.exec(tokensSource);
  expect(
    match,
    `could not find the '${theme}' token block in tokens.stylex.ts — the drift check below cannot run`,
  ).not.toBeNull();
  return match?.[1] ?? "";
}

const THEME_BLOCKS = {
  light: themeBlock("light"),
  dark: themeBlock("dark"),
};

/**
 * Assertions on the figures cannot catch a retoned role: they would recompute from
 * the stale mapping and still agree. Only the names can.
 */
describe("text role tone mapping matches tokens.stylex.ts", () => {
  it.each([...TEXT_ROLE_TONES])(
    "$role resolves to the tones $light.text / $dark.text",
    (role) => {
      for (const theme of ["light", "dark"] as const) {
        expect(
          THEME_BLOCKS[theme],
          `tokens.stylex.ts no longer maps ${theme} '${role.role}' to gray.${role[theme].text}. ` +
            `Update TEXT_ROLE_TONES in text-role-contrast.ts to the new tone, then re-read the ` +
            `Contrast copy in accessibility-showcase.tsx — the prose describes where these ratios ` +
            `sit relative to the WCAG floors, and moving a tone can make it false.`,
        ).toContain(`${role.role}: gray.${role[theme].text},`);
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
        THEME_BLOCKS[theme],
        `tokens.stylex.ts no longer maps ${theme} '${background}' to gray.${tone}. ` +
          `The page labels each figure with this background by name, so update both ` +
          `TEXT_ROLE_TONES and the labels in accessibility-showcase.tsx.`,
      ).toContain(`${background}: gray.${tone},`);
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
