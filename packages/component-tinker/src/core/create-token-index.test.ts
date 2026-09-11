import { beforeAll, describe, expect, it } from "vitest";
import { buildAdapter } from "../adapter/index.mjs";
import {
  cornerShapeFor,
  createTokenIndex,
  parseStyleValue,
  resolveStyleValue,
  tokenReferencesIn,
  type TokenIndex,
} from "./create-token-index.ts";

// buildAdapter() compiles the whole design system, so it is built once and
// shared: these tests are about the token index, not about the adapter.
let index: TokenIndex;

beforeAll(() => {
  index = createTokenIndex(buildAdapter().catalogue);
});

describe("parseStyleValue", () => {
  it("parses a bare token reference", () => {
    expect(parseStyleValue("controlSize._8", index)).toEqual({
      kind: "token",
      token: "controlSize._8",
    });
  });

  it("parses a plain CSS literal", () => {
    expect(parseStyleValue("10px", index)).toEqual({
      kind: "literal",
      text: "10px",
    });
  });

  it("parses a CSS keyword as a literal, not a token", () => {
    expect(parseStyleValue("transparent", index)).toEqual({
      kind: "literal",
      text: "transparent",
    });
  });

  it("parses a brace expression, collecting every token it references", () => {
    expect(
      parseStyleValue("calc({controlSize._8} - {border.size_1})", index),
    ).toEqual({
      kind: "expression",
      text: "calc({controlSize._8} - {border.size_1})",
      tokens: ["controlSize._8", "border.size_1"],
    });
  });
});

describe("tokenReferencesIn", () => {
  it("names the one token in a bare reference", () => {
    expect(tokenReferencesIn("controlSize._8", index)).toEqual([
      "controlSize._8",
    ]);
  });

  it("names every token inside a brace expression", () => {
    expect(
      tokenReferencesIn("calc({controlSize._8} - {border.size_1})", index),
    ).toEqual(["controlSize._8", "border.size_1"]);
  });

  it("names none for a literal", () => {
    expect(tokenReferencesIn("transparent", index)).toEqual([]);
  });
});

describe("resolveStyleValue", () => {
  it("resolves a token reference to the CSS it compiles to", () => {
    const ref = index.ref("controlSize._8");
    expect(ref).toBeDefined();
    expect(resolveStyleValue("controlSize._8", index)).toBe(ref);
  });

  it("passes a literal through unchanged", () => {
    expect(resolveStyleValue("10px", index)).toBe("10px");
  });

  it("passes a keyword through unchanged, since it names no token", () => {
    expect(resolveStyleValue("transparent", index)).toBe("transparent");
  });

  it("substitutes every token inside a brace expression", () => {
    const controlSizeRef = index.ref("controlSize._8");
    const borderRef = index.ref("border.size_1");
    if (controlSizeRef === undefined || borderRef === undefined) {
      throw new Error("Expected controlSize._8 and border.size_1 to resolve.");
    }
    const resolved = resolveStyleValue(
      "calc({controlSize._8} - {border.size_1})",
      index,
    );
    expect(resolved).toBe(`calc(${controlSizeRef} - ${borderRef})`);
  });

  it("throws for a preset-kind token, which carries a class rather than a CSS value", () => {
    // "transition.colors" is a real, known token — compose-layer-style.ts
    // detects it via `isPresetToken` and applies its class instead of calling
    // resolveStyleValue on it. Called directly, resolveStyleValue has no CSS
    // value to give it and throws.
    expect(() => resolveStyleValue("transition.colors", index)).toThrow(
      /Unknown token reference/,
    );
  });
});

describe("cornerShapeFor", () => {
  it("pairs a border radius token with a squircle", () => {
    expect(cornerShapeFor("border.radius_2", index)).toBe("squircle");
  });

  it("pairs border.radius_round with a round cap instead", () => {
    expect(cornerShapeFor("border.radius_round", index)).toBe("round");
  });

  it("is undefined for a token outside the radius group", () => {
    expect(cornerShapeFor("space._2", index)).toBeUndefined();
  });

  it("is undefined for a literal value", () => {
    expect(cornerShapeFor("4px", index)).toBeUndefined();
  });
});
