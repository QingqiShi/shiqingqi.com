import { describe, expect, it } from "vitest";
import { readCustomProperty } from "./read-custom-property.ts";

describe("readCustomProperty", () => {
  it("splits a light-dark() pair", () => {
    const css = ":root, .x1{--xveytsa:light-dark(#212220, #E9E8E4);}";

    expect(readCustomProperty(css, "var(--xveytsa)")).toEqual({
      light: "#212220",
      dark: "#E9E8E4",
    });
  });

  it("gives a plain value to both schemes", () => {
    const css = ":root{--xabc:#FFFFFF;--xdef:0.4;}";

    expect(readCustomProperty(css, "var(--xabc)")).toEqual({
      light: "#FFFFFF",
      dark: "#FFFFFF",
    });
  });

  it("keeps a half that carries its own parentheses whole", () => {
    const css =
      ":root{--xbqm4s8:light-dark(rgba(107,0,152, 0.08), rgba(232,178,255, 0.12));}";

    expect(readCustomProperty(css, "var(--xbqm4s8)")).toEqual({
      light: "rgba(107,0,152, 0.08)",
      dark: "rgba(232,178,255, 0.12)",
    });
  });

  it("reads the last declaration in a rule", () => {
    const css = ":root{--xabc:#000000;--xdef:light-dark(#111111, #222222)}";

    expect(readCustomProperty(css, "var(--xdef)")).toEqual({
      light: "#111111",
      dark: "#222222",
    });
  });

  it("names the property it cannot find", () => {
    expect(() =>
      readCustomProperty(":root{--xabc:#000000;}", "var(--xdef)"),
    ).toThrow("The compiled CSS declares no `--xdef`");
  });

  it("rejects a reference that is not a var()", () => {
    expect(() =>
      readCustomProperty(":root{--xabc:#000000;}", "#000000"),
    ).toThrow("`#000000` is not a `var(--name)` reference");
  });
});
