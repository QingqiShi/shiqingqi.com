import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-measure");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-measure", rule, {
  valid: [
    // V1: a Measure token
    {
      code: `const s = stylex.create({ lede: { maxInlineSize: measure.prose } });`,
    },
    // V2: the short Measure, at one breakpoint only
    {
      code: `const s = stylex.create({ hint: { maxInlineSize: { default: "none", [breakpoints.md]: measure.short } } });`,
    },
    // V3: a cap that is not a line length
    {
      code: `const s = stylex.create({ panel: { maxInlineSize: "32rem", maxWidth: "100%" } });`,
    },
    // V4: a minimum in ch sizes a box to its digits, not to a line of prose
    {
      code: `const s = stylex.create({ value: { minInlineSize: "2ch", inlineSize: "3ch" } });`,
    },
    // V5: a token definition is not an applied style
    {
      code: `export const tokens = stylex.defineConsts({ maxInlineSize: "65ch" });`,
    },
    // V6: a plain object is JavaScript, not a style
    {
      code: `const options = { maxWidth: "60ch" };`,
    },
    // V7: a word that ends in ch is not a length
    {
      code: `const s = stylex.create({ a: { maxInlineSize: "stretch" } });`,
    },
  ],
  invalid: [
    // I1: a raw ch cap
    {
      code: `const s = stylex.create({ note: { maxInlineSize: "65ch" } });`,
      errors: [{ messageId: "rawCh" }],
    },
    // I2: the physical property too
    {
      code: `const s = stylex.create({ empty: { maxWidth: "24ch" } });`,
      errors: [{ messageId: "rawCh" }],
    },
    // I3: inside a responsive value
    {
      code: `const s = stylex.create({ intro: { maxInlineSize: { default: "100%", [breakpoints.md]: "60ch" } } });`,
      errors: [{ messageId: "rawCh" }],
    },
    // I4: inside a computed value
    {
      code: "const s = stylex.create({ col: { maxInlineSize: `min(100%, 60ch)` } });",
      errors: [{ messageId: "rawCh" }],
    },
    // I5: in the fixed part of a template literal
    {
      code: "const s = stylex.create({ col: { maxInlineSize: `calc(${space._4} + 40ch)` } });",
      errors: [{ messageId: "rawCh" }],
    },
    // I6: a decimal ch length
    {
      code: `const s = stylex.create({ col: { "maxInlineSize": ".5ch" } });`,
      errors: [{ messageId: "rawCh" }],
    },
  ],
});
