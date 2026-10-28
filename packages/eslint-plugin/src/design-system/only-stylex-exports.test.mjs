import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./only-stylex-exports");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("only-stylex-exports", rule, {
  valid: [
    // V1: stylex.create
    {
      code: `export const styles = stylex.create({ root: { color: "red" } });`,
    },
    // V4: exports that declare no value
    { code: `export function helper() {}` },
  ],

  invalid: [
    // I1: a plain number — the shape that silently killed Button's transition
    {
      code: `export const PRESS_ANIMATION_DURATION = 150;`,
      errors: [
        {
          messageId: "notStylexConstruct",
          data: { name: "PRESS_ANIMATION_DURATION" },
        },
      ],
    },
    // I2: a plain object literal
    {
      code: `export const duration = { _150: "150ms" };`,
      errors: [{ messageId: "notStylexConstruct", data: { name: "duration" } }],
    },
  ],
});
