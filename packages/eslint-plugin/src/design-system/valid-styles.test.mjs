import { RuleTester } from "eslint";
import tsEslint from "typescript-eslint";
import rule from "./valid-styles.mjs";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsEslint.parser,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

const imports = `
  import * as stylex from "@stylexjs/stylex";
  import { svgTokens } from "./svg.stylex";
  import { brand } from "./brand.stylex.ts";
`;

const stringLimit = {
  propLimits: { WebkitMaskClip: { limit: "string", reason: "Safari" } },
};

const colorValueError = { message: /^color value must be one of:\n/ };
const unknownKeyError = {
  message: "This is not a key that is allowed by stylex",
};
const invalidConditionError = {
  message: "Invalid Pseudo class or At Rule used for conditional style value",
};

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("valid-styles", rule, {
  valid: [
    // V1: stylex.firstThatWorks() with token arguments
    {
      code: `${imports}
        export const styles = stylex.create({
          svg: { color: stylex.firstThatWorks(svgTokens.fill, brand.bristol) },
        });
      `,
    },
    // V2: firstThatWorks() as the value of a condition
    {
      code: `${imports}
        export const styles = stylex.create({
          svg: {
            color: {
              default: "red",
              ":hover": stylex.firstThatWorks(svgTokens.fill, "blue"),
            },
          },
        });
      `,
    },
    // V3: firstThatWorks() in a dynamic style
    {
      code: `${imports}
        export const styles = stylex.create({
          svg: (fallback) => ({
            color: stylex.firstThatWorks(svgTokens.fill, fallback),
          }),
        });
      `,
    },
    // V4: firstThatWorks() with string arguments, under the forwarded propLimits
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          mask: {
            WebkitMaskClip: stylex.firstThatWorks("border-box", "padding-box"),
          },
        });
      `,
      options: [stringLimit],
    },
    // V5: an :is() condition from a constant, as in selected.stylex.ts
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        const SELECTED = ":is([aria-pressed=true], [aria-selected=true])";
        export const styles = stylex.create({
          quiet: {
            backgroundColor: {
              default: "transparent",
              [SELECTED]: {
                default: "blue",
                ":hover": { default: null, "@media (hover: hover)": "navy" },
              },
            },
          },
        });
      `,
    },
    // V6: :where() and :not() conditions
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          box: {
            color: {
              default: "red",
              ":where(.dark)": { default: "white" },
              ":not([hidden])": { default: "black" },
            },
          },
        });
      `,
    },
  ],

  invalid: [
    // I1: a bad color value
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          svg: { color: 5 },
        });
      `,
      errors: [colorValueError],
    },
    // I2: a spread argument
    {
      code: `${imports}
        export const styles = stylex.create({
          svg: { color: stylex.firstThatWorks(...[svgTokens.fill]) },
        });
      `,
      errors: [colorValueError],
    },
    // I3: a call that is not firstThatWorks()
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        const pick = (value) => value;
        export const styles = stylex.create({
          svg: { color: pick("red") },
        });
      `,
      errors: [colorValueError],
    },
    // I4: a firstThatWorks() call that is not on the stylex namespace
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        import { firstThatWorks } from "./elsewhere";
        export const styles = stylex.create({
          svg: { color: firstThatWorks("red", "blue") },
        });
      `,
      errors: [colorValueError],
    },
    // I5: an unknown pseudo-class
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          link: { color: { default: "red", ":hovr": { default: "blue" } } },
        });
      `,
      errors: [invalidConditionError],
    },
    // I6: a selector other than :is(), :where() and :not()
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          link: { color: { default: "red", ":has(img)": { default: "blue" } } },
        });
      `,
      errors: [invalidConditionError],
    },
    // I7: a bad property
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          svg: { colr: "red" },
        });
      `,
      errors: [
        {
          ...unknownKeyError,
          suggestions: [
            {
              desc: 'Did you mean "color"?',
              output: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          svg: { color: "red" },
        });
      `,
            },
          ],
        },
      ],
    },
    // I8: a property that propLimits does not allow, without the options
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          mask: {
            WebkitMaskClip: stylex.firstThatWorks("border-box", "padding-box"),
          },
        });
      `,
      errors: [unknownKeyError],
    },
    // I9: an :is() condition at the top level
    {
      code: `
        import * as stylex from "@stylexjs/stylex";
        export const styles = stylex.create({
          link: { ":is(.x)": { color: "red" } },
        });
      `,
      errors: [
        {
          message:
            "Pseudo Classes, Media Queries and other At Rules should be nested as conditions within style properties. Only Pseudo Elements (::after) are allowed at the top-level",
        },
      ],
    },
  ],
});
