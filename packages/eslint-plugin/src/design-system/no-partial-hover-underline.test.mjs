import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./no-partial-hover-underline");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

ruleTester.run("no-partial-hover-underline", rule, {
  valid: [
    // V1: a plain hover underline on an inline link
    {
      code: `const styles = stylex.create({
        link: { textDecoration: { default: "none", ":hover": "underline" } },
      });`,
    },
    // V2: a stylex.when hover on a property other than a text decoration
    {
      code: `const styles = stylex.create({
        title: { color: { default: "red", [stylex.when.ancestor(":hover")]: "blue" } },
      });`,
    },
    // V3: a text decoration that is not an applied style
    {
      code: `const plain = {
        textDecoration: { [stylex.when.ancestor(":hover")]: "underline" },
      };`,
    },
  ],

  invalid: [
    // I1: the underline of a title when its card is hovered
    {
      code: `const styles = stylex.create({
        title: {
          textDecoration: { default: "none", [stylex.when.ancestor(":hover")]: "underline" },
        },
      });`,
      errors: [{ messageId: "partialHoverUnderline" }],
    },
    // I2: the same inside a [pointer.canHover] branch, on textDecorationLine
    {
      code: `const styles = stylex.create({
        title: {
          textDecorationLine: {
            default: "none",
            [pointer.canHover]: {
              default: null,
              [stylex.when.ancestor(":hover")]: "underline",
            },
          },
        },
      });`,
      errors: [{ messageId: "partialHoverUnderline" }],
    },
  ],
});
