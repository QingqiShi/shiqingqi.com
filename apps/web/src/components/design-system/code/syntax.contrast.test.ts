import { cyan } from "@tuja/ui/palette/cyan";
import { gray } from "@tuja/ui/palette/gray";
import { green } from "@tuja/ui/palette/green";
import { purple } from "@tuja/ui/palette/purple";
import { themeSource } from "@tuja/ui/tokens.stylex";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "../sections/tokens/text-role-contrast.ts";
import { TOKEN_KINDS } from "./code-token.ts";
import { syntaxSource } from "./syntax.stylex.ts";

// The tones `syntax.stylex.ts` writes out. StyleX cannot inline a hue across a
// package boundary, so this table is what keeps the two the same.
const TONES = {
  light: {
    plain: gray._13,
    keyword: purple._30,
    string: green._30,
    comment: gray._40,
    number: green._30,
    tag: gray._30,
    component: purple._30,
    attr: cyan._30,
    property: cyan._30,
    punct: gray._30,
  },
  dark: {
    plain: gray._92,
    keyword: purple._70,
    string: green._60,
    comment: gray._60,
    number: green._60,
    tag: gray._80,
    component: purple._70,
    attr: cyan._70,
    property: cyan._70,
    punct: gray._80,
  },
};

// Code sits on `bgSurfaceRaised`, so that is the only surface a syntax colour
// lands on. Each colour must clear WCAG AA there in both themes.

const AA_SMALL_TEXT = 4.5;

describe.each(["light", "dark"] as const)("%s syntax colours", (scheme) => {
  const kinds = syntaxSource[scheme];
  const surface = themeSource[scheme].bgSurfaceRaised;

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
  it("holds the palette tones it names", () => {
    expect(syntaxSource).toEqual(TONES);
  });

  it("gives every kind a colour", () => {
    expect(Object.keys(syntaxSource.light).sort()).toEqual(
      [...TOKEN_KINDS].sort(),
    );
    expect(Object.keys(syntaxSource.dark).sort()).toEqual(
      [...TOKEN_KINDS].sort(),
    );
  });

  // Kinds that share a job share a colour. Three hues carry the whole block.
  it.each(["light", "dark"] as const)("holds three hues in %s", (scheme) => {
    const kinds = syntaxSource[scheme];

    expect(kinds.number).toBe(kinds.string);
    expect(kinds.property).toBe(kinds.attr);
    expect(kinds.component).toBe(kinds.keyword);
    expect(kinds.tag).toBe(kinds.punct);
    expect(new Set(Object.values(kinds)).size).toBe(6);
  });
});
