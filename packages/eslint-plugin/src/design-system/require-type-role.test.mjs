import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-type-role");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-type-role", rule, {
  valid: [
    // V1: weight, leading and tracking from font tokens
    {
      code: `const s = stylex.create({ title: { fontWeight: font.weight_6, lineHeight: font.lineHeight_0, letterSpacing: font.trackingWide } });`,
    },
    // V2: a glyph sized to a control
    {
      code: `const s = stylex.create({ mark: { fontSize: controlSize._3 } });`,
    },
    // V3: a font size that picks no value of its own
    {
      code: `const s = stylex.create({ reset: { fontSize: "inherit", fontWeight: "inherit", lineHeight: 0, font: "inherit", fontVariantNumeric: "normal", letterSpacing: null } });`,
    },
    // V4: a token definition is not an applied style
    {
      code: `export const tokens = stylex.defineVars({ fontSize: "1rem", fontWeight: 600 });`,
    },
    // V5: a plain object is JavaScript, not a style
    {
      code: `const options = { fontSize: 12, lineHeight: 1.4 };`,
    },
    // V6: a component token for the weight
    {
      code: `const s = stylex.create({ link: { fontWeight: anchorTokens.fontWeight } });`,
    },
    // V7: a token group the config allows
    {
      code: `const s = stylex.create({ glyph: { fontSize: glyphTokens.size } });`,
      options: [{ sizeTokenGroups: ["glyphTokens"] }],
    },
    // V8: the family from a token
    {
      code: `const s = stylex.create({ code: { fontFamily: font.familyMono } });`,
    },
    // V9: an aliased control size
    {
      code: `import { controlSize as c } from "@tuja/ui/tokens.stylex"; const s = stylex.create({ mark: { fontSize: c._4 } });`,
    },
  ],

  invalid: [
    // I1: a size token on its own
    {
      code: `const s = stylex.create({ note: { fontSize: font.uiBodySmall } });`,
      errors: [{ messageId: "fontSize", data: { value: "font.uiBodySmall" } }],
    },
    // I2: a raw size
    {
      code: `const s = stylex.create({ note: { fontSize: "11px" } });`,
      errors: [{ messageId: "fontSize", data: { value: '"11px"' } }],
    },
    // I3: each branch of a conditional size
    {
      code: `const s = stylex.create({ title: { fontSize: { default: font.uiHeading3, [breakpoints.md]: font.uiHeading1 } } });`,
      errors: [{ messageId: "fontSize" }, { messageId: "fontSize" }],
    },
    // I4: raw weight, leading and tracking
    {
      code: `const s = stylex.create({ label: { fontWeight: 600, lineHeight: 1.2, letterSpacing: "0.08em" } });`,
      errors: [
        {
          messageId: "raw",
          data: { property: "fontWeight", value: "600" },
        },
        {
          messageId: "raw",
          data: { property: "lineHeight", value: "1.2" },
        },
        {
          messageId: "raw",
          data: { property: "letterSpacing", value: '"0.08em"' },
        },
      ],
    },
    // I5: figures set by hand
    {
      code: `const s = stylex.create({ score: { fontVariantNumeric: "tabular-nums" } });`,
      errors: [{ messageId: "numeric", data: { value: '"tabular-nums"' } }],
    },
    // I6: the font shorthand
    {
      code: `const s = stylex.create({ score: { font: "600 1rem/1.2 Inter" } });`,
      errors: [{ messageId: "fontShorthand" }],
    },
    // I7: a raw family
    {
      code: `const s = stylex.create({ code: { fontFamily: "monospace" } });`,
      errors: [{ messageId: "raw" }],
    },
    // I8: a property inside a pseudo-class object
    {
      code: `const s = stylex.create({ item: { ":hover": { fontWeight: "700" } } });`,
      errors: [{ messageId: "raw" }],
    },
    // I9: a size from a parameter of a dynamic style
    {
      code: `const s = stylex.create({ glyph: (size) => ({ fontSize: size }) });`,
      errors: [{ messageId: "fontSize" }],
    },
    // I10: a negative raw tracking, and a static template literal
    {
      code: "const s = stylex.create({ hero: { letterSpacing: -1, lineHeight: `1.1` } });",
      errors: [{ messageId: "raw" }, { messageId: "raw" }],
    },
    // I11: a string-literal key
    {
      code: `const s = stylex.create({ note: { "fontSize": font.uiCaption } });`,
      errors: [{ messageId: "fontSize" }],
    },
  ],
});
