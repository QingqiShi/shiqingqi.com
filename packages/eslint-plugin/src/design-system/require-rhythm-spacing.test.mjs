import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-rhythm-spacing");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-rhythm-spacing", rule, {
  valid: [
    // V1: a rhythm step
    {
      code: `const s = stylex.create({ list: { gap: rhythm.item } });`,
    },
    // V2: a gap inside a control
    {
      code: `const s = stylex.create({ button: { gap: controlSize._2 } });`,
    },
    // V3: padding is geometry, not a relationship
    {
      code: `const s = stylex.create({ card: { padding: space._4, paddingBlock: space._3 } });`,
    },
    // V4: an offset computed from the scale
    {
      code: "const s = stylex.create({ nudge: { marginInlineStart: `calc(-1 * ${space._0})` } });",
    },
    // V5: zero and auto are not steps
    {
      code: `const s = stylex.create({ reset: { margin: 0, marginInline: "auto", gap: 0 } });`,
    },
    // V6: a token definition is not an applied style
    {
      code: `export const tokens = stylex.defineVars({ gap: space._2 });`,
    },
    // V7: a plain object is JavaScript, not a style
    {
      code: `const options = { gap: space._2 };`,
    },
    // V8: a computed key is not statically a spacing property
    {
      code: `const s = stylex.create({ list: { [gap]: space._2 } });`,
    },
    // V9: a responsive rhythm value
    {
      code: `const s = stylex.create({ list: { rowGap: { default: rhythm.item, [breakpoints.md]: rhythm.group } } });`,
    },
    // V10: the parts of one unit on one line
    {
      code: `const s = stylex.create({ label: { gap: rhythm.inline } });`,
    },
    // V11: a token group the config allows, such as a gridline width
    {
      code: `const s = stylex.create({ grid: { gap: gridlineTokens.width } });`,
      options: [{ gapTokenGroups: ["gridlineTokens"] }],
    },
    // V12: a margin may be 0, auto, a negative offset or a rhythm step
    {
      code: `const s = stylex.create({ a: { margin: "0 auto", marginBlockStart: "-1px", marginBlockEnd: rhythm.item, marginInline: null } });`,
    },
    // V13: a margin computed from another token is not a size pick
    {
      code: `const s = stylex.create({ a: { marginInline: controlSize._0, marginBlock: \`\${rhythm.tight}\` } });`,
    },
    // V14: an alias that is not a space token
    {
      code: `import { rhythm as r } from "@tuja/ui/tokens.stylex"; const s = stylex.create({ list: { gap: r.item } });`,
    },
    // V15: a negative offset written as a product
    {
      code: "const s = stylex.create({ bleed: { marginInline: `calc(${space._4} * -1)` } });",
    },
  ],

  invalid: [
    // I1: a gap picked by size
    {
      code: `const s = stylex.create({ list: { gap: space._2 } });`,
      errors: [
        {
          messageId: "gapStep",
          data: { property: "gap", value: "space._2" },
        },
      ],
    },
    // I2: each axis of the gap
    {
      code: `const s = stylex.create({ grid: { rowGap: space._3, columnGap: space._1 } });`,
      errors: [
        {
          messageId: "gapStep",
          data: { property: "rowGap", value: "space._3" },
        },
        {
          messageId: "gapStep",
          data: { property: "columnGap", value: "space._1" },
        },
      ],
    },
    // I3: a margin between siblings
    {
      code: `const s = stylex.create({ title: { marginBlockEnd: space._1 } });`,
      errors: [
        {
          messageId: "marginStep",
          data: { property: "marginBlockEnd", value: "space._1" },
        },
      ],
    },
    // I4: each branch of a conditional value
    {
      code: `const s = stylex.create({ list: { gap: { default: space._4, [breakpoints.md]: space._7 } } });`,
      errors: [
        {
          messageId: "gapStep",
          data: { property: "gap", value: "space._4" },
        },
        {
          messageId: "gapStep",
          data: { property: "gap", value: "space._7" },
        },
      ],
    },
    // I5: a pseudo-class branch nests through to the property
    {
      code: `const s = stylex.create({ item: { marginBlockStart: { default: null, ":not(:first-child)": space._3 } } });`,
      errors: [{ messageId: "marginStep" }],
    },
    // I6: string-literal keys
    {
      code: `const s = stylex.create({ list: { "gap": space._2 } });`,
      errors: [{ messageId: "gapStep" }],
    },
    // I7: a property inside a pseudo-class object
    {
      code: `const s = stylex.create({ list: { ":hover": { margin: space._1 } } });`,
      errors: [
        {
          messageId: "marginStep",
          data: { property: "margin", value: "space._1" },
        },
      ],
    },
    // I8: an aliased import still reads the space scale
    {
      code: `import { space as s } from "@tuja/ui/tokens.stylex"; const styles = stylex.create({ list: { gap: s._2 } });`,
      errors: [
        { messageId: "gapStep", data: { property: "gap", value: "s._2" } },
      ],
    },
    // I9: a namespace import
    {
      code: `import * as tokens from "@tuja/ui/tokens.stylex"; const s = stylex.create({ title: { marginBlockEnd: tokens.space._1 } });`,
      errors: [{ messageId: "marginStep" }],
    },
    // I10: a computed string key and a static template key
    {
      code: 'const s = stylex.create({ list: { ["gap"]: space._2, [`rowGap`]: space._1 } });',
      errors: [{ messageId: "gapStep" }, { messageId: "gapStep" }],
    },
    // I11: a raw length, as a literal or a static template literal
    {
      code: 'const s = stylex.create({ list: { gap: "8px", columnGap: `1rem` } });',
      errors: [
        { messageId: "gapStep", data: { property: "gap", value: '"8px"' } },
        {
          messageId: "gapStep",
          data: { property: "columnGap", value: "`1rem`" },
        },
      ],
    },
    // I12: a gap takes only the allowed token groups
    {
      code: `const s = stylex.create({ grid: { gap: border.size_1 } });`,
      errors: [{ messageId: "gapStep" }],
    },
    // I13: a margin of a raw length, or computed from the space scale
    {
      code: 'const s = stylex.create({ a: { marginTop: "8px", marginInline: "0 2px", marginBlockEnd: `calc(${space._3} + 1px)` } });',
      errors: [
        { messageId: "marginStep" },
        { messageId: "marginStep" },
        { messageId: "marginStep" },
      ],
    },
  ],
});
