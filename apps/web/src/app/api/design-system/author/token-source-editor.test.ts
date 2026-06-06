import { describe, expect, it } from "vitest";
import {
  applyColorEditToSource,
  applyScalarEditToSource,
  ensurePaletteImport,
  TokenEditError,
} from "./token-source-editor.ts";

// Double-quoted strings keep `${…}` literal (only template literals interpolate),
// so the fixtures and assertions below contain real `rgba(${…})` recipe text.

describe("applyColorEditToSource", () => {
  const source = [
    "const light = { textMain: gray._20 };",
    "const dark = { textMain: gray._92 };",
    "export const color = stylex.defineVars({",
    "  textMain: { default: light.textMain, [DARK]: dark.textMain },",
    "});",
    "",
  ].join("\n");

  it("edits the light object only, leaving dark and the defineVars refs intact", async () => {
    const out = await applyColorEditToSource(source, "textMain", {
      targetObject: "light",
      expression: "gray._40",
      paletteImport: "gray",
      drift: null,
    });
    expect(out).toContain("const light = { textMain: gray._40 };");
    expect(out).toContain("const dark = { textMain: gray._92 };");
    // The 130-odd `light.x`/`dark.x` member refs in the color group must survive.
    expect(out).toContain("default: light.textMain");
  });

  it("edits the dark object when targeted", async () => {
    const out = await applyColorEditToSource(source, "textMain", {
      targetObject: "dark",
      expression: "gray._50",
      paletteImport: "gray",
      drift: null,
    });
    expect(out).toContain("const dark = { textMain: gray._50 };");
    expect(out).toContain("const light = { textMain: gray._20 };");
  });

  it("replaces a recipe value wholesale, preserving the template shape", async () => {
    const recipe =
      "const light = { accentBorder: `rgba(${purple_rgb._30}, 0.4)` };\n";
    const out = await applyColorEditToSource(recipe, "accentBorder", {
      targetObject: "light",
      expression: "`rgba(${purple_rgb._50}, 0.4)`",
      paletteImport: "purple_rgb",
      drift: null,
    });
    expect(out).toContain("accentBorder: `rgba(${purple_rgb._50}, 0.4)`");
  });

  it("throws TokenEditError for an unknown member", async () => {
    await expect(
      applyColorEditToSource(
        "const light = { textMain: gray._20 };\n",
        "nope",
        {
          targetObject: "light",
          expression: "gray._40",
          paletteImport: "gray",
          drift: null,
        },
      ),
    ).rejects.toThrow(TokenEditError);
  });
});

describe("applyScalarEditToSource", () => {
  it("replaces a plain quoted length literal", async () => {
    const source =
      'export const space = stylex.defineVars({\n  _3: "1rem",\n});\n';
    const out = await applyScalarEditToSource(source, {
      group: "space",
      member: "_3",
      value: "1.25rem",
    });
    expect(out).toContain('_3: "1.25rem"');
  });

  it("preserves a stylex.types.integer wrapper, editing only the argument", async () => {
    const source =
      "export const font = stylex.defineVars({\n  weight_7: stylex.types.integer(700),\n});\n";
    const out = await applyScalarEditToSource(source, {
      group: "font",
      member: "weight_7",
      value: "800",
    });
    expect(out).toContain("weight_7: stylex.types.integer(800)");
  });

  it("preserves a stylex.types.number wrapper, editing only the argument", async () => {
    const source =
      "export const font = stylex.defineVars({\n  lineHeight_4: stylex.types.number(1.5),\n});\n";
    const out = await applyScalarEditToSource(source, {
      group: "font",
      member: "lineHeight_4",
      value: "1.6",
    });
    expect(out).toContain("lineHeight_4: stylex.types.number(1.6)");
  });

  it("throws TokenEditError for an unknown member", async () => {
    const source =
      'export const space = stylex.defineVars({\n  _3: "1rem",\n});\n';
    await expect(
      applyScalarEditToSource(source, {
        group: "space",
        member: "_99",
        value: "9rem",
      }),
    ).rejects.toThrow(TokenEditError);
  });
});

describe("ensurePaletteImport", () => {
  const header = [
    'import { gray } from "./_generated/palette/gray.stylex.ts";',
    'import { purple, purple_rgb } from "./_generated/palette/purple.stylex.ts";',
    'import { breakpoints } from "./breakpoints.stylex.ts";',
    "",
    "const light = { textMain: gray._20 };",
    "",
  ].join("\n");

  it("is a no-op when the const is already imported", async () => {
    expect(await ensurePaletteImport(header, "gray")).toBe(header);
    expect(await ensurePaletteImport(header, "purple_rgb")).toBe(header);
  });

  it("inserts a new import for a hue the file doesn't reference yet", async () => {
    const out = await ensurePaletteImport(header, "teal");
    expect(out).toContain(
      'import { teal } from "./_generated/palette/teal.stylex.ts";',
    );
    // The original imports and body survive.
    expect(out).toContain("const light = { textMain: gray._20 };");
  });

  it("extends an existing hue import to add its _rgb channel", async () => {
    const out = await ensurePaletteImport(header, "gray_rgb");
    expect(out).toContain(
      'import { gray, gray_rgb } from "./_generated/palette/gray.stylex.ts";',
    );
  });
});
