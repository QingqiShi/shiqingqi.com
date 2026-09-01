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
    // V2: any other stylex construct
    { code: `export const vars = stylex.defineVars({ gap: "1px" });` },
    { code: `export const consts = stylex.defineConsts({ sm: "1px" });` },
    {
      code: `export const fadeIn = stylex.keyframes({ from: { opacity: 0 } });`,
    },
    // V3: a non-stylex plain value that is not exported
    { code: `const PRESS_DURATION = 150;` },
    // V4: exports that declare no value
    { code: `export function helper() {}` },
    { code: `const a = 1; export { a };` },
    { code: `export * from "./other.js";` },
    // V5: export let/var are not `export const` and out of scope
    { code: `export let mutable = 1;` },
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
    // I3: a call on something other than `stylex`
    {
      code: `export const styles = css.create({ root: {} });`,
      errors: [{ messageId: "notStylexConstruct", data: { name: "styles" } }],
    },
    // I4: a member reference, not a call
    {
      code: `export const create = stylex.create;`,
      errors: [{ messageId: "notStylexConstruct", data: { name: "create" } }],
    },
    // I5: one report per declarator
    {
      code: `export const a = 1, b = stylex.create({}), c = 2;`,
      errors: [
        { messageId: "notStylexConstruct", data: { name: "a" } },
        { messageId: "notStylexConstruct", data: { name: "c" } },
      ],
    },
  ],
});
