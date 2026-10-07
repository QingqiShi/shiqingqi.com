import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-hover-media");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

const WHEN = 'stylex.when.ancestor(":is(:hover, :focus-within)", tileMarker)';

/** @param {string} value */
const gated = (value) => `{ default: null, [pointer.canHover]: ${value} }`;

/** @param {string} output */
const wrapInGate = (output) => [{ messageId: "wrapInGate", output }];

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-hover-media", rule, {
  valid: [
    // V1: the hover value wrapped in the gate
    {
      code: `const s = stylex.create({ a: { color: { default: color.fg, ":hover": { default: null, [pointer.canHover]: color.fgMuted } } } });`,
    },
    // V2: the gate holding a revealed state back, with touch on the full state
    {
      code: `const s = stylex.create({ a: { opacity: { default: 1, [pointer.canHover]: { default: 0, ":hover": 1 } } } });`,
    },
    // V3: an ancestor selector inside the gate
    {
      code: `const s = stylex.create({ a: { opacity: { default: 1, [pointer.canHover]: { default: 0.9, [${WHEN}]: 1 } } } });`,
    },
    // V4: the stricter gate that also excludes every touch pointer
    {
      code: `const s = stylex.create({ a: { scrollbarColor: { default: "auto", [NON_TOUCH_DEVICE]: { default: "transparent", ":hover": "gray" } } } });`,
    },
    // V5: a token definition is not an applied style
    {
      code: `export const t = stylex.defineVars({ color: { default: "red", ":hover": "blue" } });`,
    },
    // V6: a plain object is JavaScript, not a style
    {
      code: `const options = { ":hover": "blue" };`,
    },
    // V7: other pseudo-classes need no gate
    {
      code: `const s = stylex.create({ a: { color: { default: "red", ":focus-visible": "blue", ":active": "green" } } });`,
    },
    // V8: a press state gated beside its gated hover
    {
      code: `const s = stylex.create({ a: { transform: { default: null, ":hover": { default: null, [pointer.canHover]: "scale(1.03)" }, ":active": { default: "scale(0.98)", [pointer.canHover]: "scale(0.98)" } } } });`,
    },
    // V9: a press state repeated inside the gate it shares with the hover
    {
      code: `const s = stylex.create({ a: { color: { default: "red", ":focus": "green", [pointer.canHover]: { default: null, ":hover": "blue", ":focus": "green" } } } });`,
    },
    // V10: `:focus-visible` and `:focus-within` rank below `:hover` in StyleX
    {
      code: `const s = stylex.create({ a: { color: { default: "red", ":hover": { default: null, [pointer.canHover]: "blue" }, ":focus-visible": "green", ":focus-within": "green" } } });`,
    },
  ],

  invalid: [
    // I1: a bare hover
    {
      code: `const s = stylex.create({ a: { color: { default: "red", ":hover": "blue" } } });`,
      errors: [
        {
          messageId: "ungated",
          data: { key: '":hover"' },
          suggestions: wrapInGate(
            `const s = stylex.create({ a: { color: { default: "red", ":hover": ${gated('"blue"')} } } });`,
          ),
        },
      ],
    },
    // I2: compound and negated hover selectors
    {
      code: `const s = stylex.create({ a: { color: { default: "red", ":disabled:hover": "red", ":hover:not(:disabled)": "blue" }, fill: { ":not(:hover)": "gray" } } });`,
      errors: [
        // A chained key takes no nested value, so it has no suggestion.
        { messageId: "ungated", data: { key: '":disabled:hover"' } },
        { messageId: "ungated", data: { key: '":hover:not(:disabled)"' } },
        {
          messageId: "ungated",
          data: { key: '":not(:hover)"' },
          suggestions: wrapInGate(
            `const s = stylex.create({ a: { color: { default: "red", ":disabled:hover": "red", ":hover:not(:disabled)": "blue" }, fill: { ":not(:hover)": ${gated('"gray"')} } } });`,
          ),
        },
      ],
    },
    // I3: an ancestor selector that matches on hover
    {
      code: `const s = stylex.create({ a: { opacity: { default: 0.9, [${WHEN}]: 1 } } });`,
      errors: [
        {
          messageId: "ungated",
          suggestions: wrapInGate(
            `const s = stylex.create({ a: { opacity: { default: 0.9, [${WHEN}]: ${gated("1")} } } });`,
          ),
        },
      ],
    },
    // I4: a gate on another property does not cover this one
    {
      code: `const s = stylex.create({ a: { opacity: { default: 1, [pointer.canHover]: 0.9 }, color: { default: "red", ":hover": "blue" } } });`,
      errors: [
        {
          messageId: "ungated",
          suggestions: wrapInGate(
            `const s = stylex.create({ a: { opacity: { default: 1, [pointer.canHover]: 0.9 }, color: { default: "red", ":hover": ${gated('"blue"')} } } });`,
          ),
        },
      ],
    },
    // I5: a hover query written out
    {
      code: `const s = stylex.create({ a: { opacity: { default: 1, "@media (hover: hover)": { default: 0.9, ":hover": 1 } } } });`,
      errors: [{ messageId: "literalQuery" }],
    },
    // I6: a press state left below its gated hover
    {
      code: `const s = stylex.create({ a: { transform: { default: null, ":hover": { default: null, [pointer.canHover]: "scale(1.03)" }, ":active": "scale(0.98)" } } });`,
      errors: [{ messageId: "outranked", data: { key: ":active" } }],
    },
    // I7: a focus state missing from the gate that holds the hover
    {
      code: `const s = stylex.create({ a: { color: { default: "red", ":focus": "green", [pointer.canHover]: { default: null, ":hover": "blue" } } } });`,
      errors: [{ messageId: "outranked", data: { key: ":focus" } }],
    },
  ],
});
