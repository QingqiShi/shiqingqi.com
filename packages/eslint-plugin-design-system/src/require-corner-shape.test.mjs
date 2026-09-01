import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-corner-shape");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-corner-shape", rule, {
  valid: [
    // V1: the shorthand pairs every radius
    {
      code: `const s = stylex.create({ card: { borderRadius: border.radius_2, cornerShape: "squircle" } });`,
    },
    // V2: the longhand for that same corner
    {
      code: `const s = stylex.create({ tab: { borderTopLeftRadius: 4, cornerTopLeftShape: "squircle" } });`,
    },
    // V3: the shorthand also pairs a longhand radius
    {
      code: `const s = stylex.create({ tab: { borderEndEndRadius: 4, cornerShape: "squircle" } });`,
    },
    // V4: string-literal keys
    {
      code: `const s = stylex.create({ card: { "borderRadius": 4, "cornerShape": "squircle" } });`,
    },
    // V5: a computed key is not statically a radius
    {
      code: `const s = stylex.create({ card: { [borderRadius]: 4 } });`,
    },
    // V6: a `stylex.defineVars` argument defines tokens, not an applied style
    {
      code: `export const buttonTokens = stylex.defineVars({ borderRadius: border.radius_round });`,
    },
    // V7: a plain object is JavaScript, not a style — this one resets DOM
    // properties the browser set inline
    {
      code: `const FULL_BOX = { borderRadius: "", cornerShape: "" };`,
    },
    // V8: a radius-named identifier that is not a property key
    {
      code: `const value = tokens.borderRadius;`,
    },
    // V9: keyframes are applied styles too
    {
      code: `const grow = stylex.keyframes({ to: { borderRadius: 4, cornerShape: "squircle" } });`,
    },
    // V10: a conditional value nests under the radius, and the shape stays a
    // sibling of it
    {
      code: `const s = stylex.create({ card: { borderRadius: { default: 4, ":hover": 8 }, cornerShape: "squircle" } });`,
    },
    // V11: every radius property, each paired with its own longhand
    {
      code: `const s = stylex.create({
        a: { borderTopRightRadius: 1, cornerTopRightShape: "squircle" },
        b: { borderBottomLeftRadius: 1, cornerBottomLeftShape: "squircle" },
        c: { borderBottomRightRadius: 1, cornerBottomRightShape: "squircle" },
        d: { borderStartStartRadius: 1, cornerStartStartShape: "squircle" },
        e: { borderStartEndRadius: 1, cornerStartEndShape: "squircle" },
        f: { borderEndStartRadius: 1, cornerEndStartShape: "squircle" },
        g: { borderEndEndRadius: 1, cornerEndEndShape: "squircle" },
      });`,
    },
    // V12: a zero radius has no corner to shape
    {
      code: `const s = stylex.create({ flat: { borderRadius: 0 } });`,
    },
  ],

  invalid: [
    // I1: a bare radius
    {
      code: `const s = stylex.create({ card: { borderRadius: border.radius_2 } });`,
      errors: [
        {
          messageId: "missingCornerShape",
          data: { property: "borderRadius" },
        },
      ],
    },
    // I2: a longhand shape for a different corner does not pair
    {
      code: `const s = stylex.create({ tab: { borderTopLeftRadius: 4, cornerTopRightShape: "squircle" } });`,
      errors: [
        {
          messageId: "missingCornerShape",
          data: { property: "borderTopLeftRadius" },
        },
      ],
    },
    // I3: a longhand shape never pairs the shorthand radius
    {
      code: `const s = stylex.create({ tab: { borderRadius: 4, cornerTopLeftShape: "squircle" } });`,
      errors: [{ messageId: "missingCornerShape" }],
    },
    // I4: the shape must sit in the same object literal, not an outer one
    {
      code: `const s = stylex.create({ card: { cornerShape: "squircle", ":hover": { borderRadius: 4 } } });`,
      errors: [{ messageId: "missingCornerShape" }],
    },
    // I5: a spread does not count as a pairing
    {
      code: `const s = stylex.create({ card: { ...shapes, borderRadius: 4 } });`,
      errors: [{ messageId: "missingCornerShape" }],
    },
    // I6: a computed shape key does not count as a pairing
    {
      code: `const s = stylex.create({ card: { borderRadius: 4, [cornerShape]: "squircle" } });`,
      errors: [{ messageId: "missingCornerShape" }],
    },
    // I7: a keyframe step with no shape
    {
      code: `const grow = stylex.keyframes({ to: { borderRadius: 4 } });`,
      errors: [{ messageId: "missingCornerShape" }],
    },
  ],
});
