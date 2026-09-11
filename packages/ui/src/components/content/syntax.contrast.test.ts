import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { compileStylexCss, readCustomProperty } from "@tuja/stylex-testing";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../../test-support/contrast-ratio.ts";
import { color } from "../../tokens.stylex.ts";
import { syntax } from "./syntax.stylex.ts";
import { TOKEN_KINDS } from "./token-kinds.ts";

const here = path.dirname(fileURLToPath(import.meta.url));
const tokensFile = path.join(here, "../../tokens.stylex.ts");
const hueDir = path.join(here, "../../_generated/palette/hues");
const css = compileStylexCss([
  path.join(here, "syntax.stylex.ts"),
  tokensFile,
  ...fs
    .readdirSync(hueDir)
    .filter((file) => file.endsWith(".stylex.ts"))
    .map((file) => path.join(hueDir, file)),
]);

function resolveKinds(scheme: "light" | "dark") {
  return Object.fromEntries(
    TOKEN_KINDS.map(
      (kind) => [kind, readCustomProperty(css, syntax[kind])[scheme]] as const,
    ),
  );
}

const KINDS = {
  light: resolveKinds("light"),
  dark: resolveKinds("dark"),
};

// Code sits on `bgSurfaceRaised`, so that is the only surface a syntax colour
// lands on. Each colour must clear WCAG AA there in both themes.

const AA_SMALL_TEXT = 4.5;

describe.each(["light", "dark"] as const)("%s syntax colours", (scheme) => {
  const kinds = KINDS[scheme];
  const surface = readCustomProperty(css, color.bgSurfaceRaised)[scheme];

  it.each(TOKEN_KINDS)("%s clears AA on bgSurfaceRaised", (kind) => {
    const ratio = contrastRatio(kinds[kind], surface);

    expect(
      ratio,
      `${kind} measures ${ratio.toFixed(2)}:1`,
    ).toBeGreaterThanOrEqual(AA_SMALL_TEXT);
  });

  // The one hierarchy the colours carry: a comment is the quietest thing in the
  // block, and punctuation sits below the code it separates.
  it("lets a comment recede behind plain code", () => {
    expect(contrastRatio(kinds.comment, surface)).toBeLessThan(
      contrastRatio(kinds.plain, surface),
    );
  });

  it("lets punctuation recede behind plain code", () => {
    expect(contrastRatio(kinds.punct, surface)).toBeLessThan(
      contrastRatio(kinds.plain, surface),
    );
  });
});

describe("the syntax family", () => {
  it("gives every kind a colour", () => {
    // StyleX adds `__varGroupHash__` to a var group at run time.
    const members = Object.keys(syntax).filter((key) => !key.startsWith("__"));

    expect(members.sort()).toEqual([...TOKEN_KINDS].sort());
  });

  // Kinds that share a job share a colour. Three hues carry the whole block.
  it.each(["light", "dark"] as const)("holds three hues in %s", (scheme) => {
    const kinds = KINDS[scheme];

    expect(kinds.number).toBe(kinds.string);
    expect(kinds.property).toBe(kinds.attr);
    expect(kinds.component).toBe(kinds.keyword);
    expect(kinds.tag).toBe(kinds.punct);
    expect(new Set(Object.values(kinds)).size).toBe(6);
  });
});
