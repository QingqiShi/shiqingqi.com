import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-quiet-surface");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

ruleTester.run("require-quiet-surface", rule, {
  valid: [
    // V1: a control with a surface at rest
    {
      code: `const styles = stylex.create({
        button: {
          backgroundColor: {
            default: color.bgSurface,
            ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
          },
        },
      });`,
    },
    // V2: the token as a plain fill, not a hover
    {
      code: `const styles = stylex.create({
        bar: { backgroundColor: color.bgControlHover },
      });`,
    },
    // V3: a transparent element with a hover fill of another token
    {
      code: `const styles = stylex.create({
        row: {
          backgroundColor: {
            default: "transparent",
            ":hover": { default: null, [pointer.canHover]: color.bgAccentSubtle },
          },
        },
      });`,
    },
    // V4: a plain object that is not an applied style
    {
      code: `const plain = {
        backgroundColor: {
          default: "transparent",
          ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
        },
      };`,
    },
  ],

  invalid: [
    // I1: the hover key outside the gate
    {
      code: `const styles = stylex.create({
        row: {
          backgroundColor: {
            default: "transparent",
            ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
          },
        },
      });`,
      errors: [{ messageId: "handBuilt" }],
    },
    // I2: the gate outside the hover key
    {
      code: `const styles = stylex.create({
        row: {
          backgroundColor: {
            default: "transparent",
            [pointer.canHover]: { default: null, ":hover": color.bgControlHover },
          },
        },
      });`,
      errors: [{ messageId: "handBuilt" }],
    },
    // I3: no rest value at all
    {
      code: `const styles = stylex.create({
        row: {
          backgroundColor: {
            ":hover": { default: null, [pointer.canHover]: color.bgControlHover },
          },
        },
      });`,
      errors: [{ messageId: "handBuilt" }],
    },
  ],
});
