import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
const rule = require("./require-page-column");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

const TOKENS = `import { layout, space } from "@tuja/ui/tokens.stylex";\n`;

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("require-page-column", rule, {
  valid: [
    // V1: the page column primitive
    {
      code: `import { pageColumn } from "@tuja/ui/primitives/page-column.stylex";\nconst hero = [pageColumn.base, styles.hero];`,
    },
    // V2: one page gutter, for a control fixed at the edge of the screen
    {
      code: `const s = stylex.create({ fab: { position: "fixed", insetInlineEnd: pageGutter.inlineEnd } });`,
    },
    // V3: a top or bottom inset clears page chrome, not a column
    {
      code: 'const s = stylex.create({ page: { paddingBlockStart: `calc(${space._10} + env(safe-area-inset-top))`, paddingBlockEnd: "env(safe-area-inset-bottom)" } });',
    },
    // V4: another member of the layout consts
    {
      code: `${TOKENS}const s = stylex.create({ a: { inlineSize: layout.other } });`,
    },
    // V5: a `layout` that is not the tokens' consts
    {
      code: `import { layout } from "./grid-layout";\nconst w = layout.maxInlineSize;`,
    },
  ],
  invalid: [
    // I1: the page cap by hand
    {
      code: `${TOKENS}const s = stylex.create({ section: { maxInlineSize: layout.maxInlineSize, marginInline: "auto" } });`,
      errors: [{ messageId: "maxInlineSize" }],
    },
    // I2: the cap from the package path inside @tuja/ui, under another name
    {
      code: `import { layout as tokensLayout } from "../tokens.stylex.ts";\nconst cap = tokensLayout["maxInlineSize"];`,
      errors: [{ messageId: "maxInlineSize" }],
    },
    // I3: a gutter by hand in a template literal
    {
      code: "const s = stylex.create({ grid: { paddingLeft: `calc(${space._3} + env(safe-area-inset-left))`, paddingRight: `calc(${space._3} + env(safe-area-inset-right))` } });",
      errors: [
        { messageId: "safeArea", data: { side: "left" } },
        { messageId: "safeArea", data: { side: "right" } },
      ],
    },
    // I4: a bare safe-area inset in a string
    {
      code: `const s = stylex.create({ container: { paddingRight: "env(safe-area-inset-right)" } });`,
      errors: [{ messageId: "safeArea", data: { side: "right" } }],
    },
    // I5: an inset kept in a module constant, outside the style
    {
      code: "const insetLeft = `calc(${space._3} + env(safe-area-inset-left, 0px))`;",
      errors: [{ messageId: "safeArea", data: { side: "left" } }],
    },
    // I6: the position of a fixed control
    {
      code: "const s = stylex.create({ fab: { insetInlineEnd: `calc(${space._3} + env( safe-area-inset-right))` } });",
      errors: [{ messageId: "safeArea", data: { side: "right" } }],
    },
  ],
});
