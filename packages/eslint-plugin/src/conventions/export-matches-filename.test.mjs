import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
// `@typescript-eslint/parser` is only reachable through the `typescript-eslint`
// meta package's own node_modules, so go through its `parser` export instead
// of requiring the subpackage directly.
const tsParser = require("typescript-eslint").parser;
const rule = require("./export-matches-filename");

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("export-matches-filename", rule, {
  valid: [
    // V1: export function
    {
      filename: "src/merge-refs.ts",
      code: `export function mergeRefs() {}`,
    },
    // V2: export const
    {
      filename: "src/use-popover.ts",
      code: `export const usePopover = () => {};`,
    },
    // V3: export let
    {
      filename: "src/active-locale.ts",
      code: `export let activeLocale = "en";`,
    },
    // V4: export class
    {
      filename: "src/option-card.tsx",
      code: `export class OptionCard {}`,
    },
    // V5: SCREAMING_CASE constant
    {
      filename: "src/featured-creatures.ts",
      code: `export const FEATURED_CREATURES = [];`,
    },
    // V6: PascalCase component in a .tsx file
    {
      filename: "src/posthog-init.tsx",
      code: `export function PostHogInit() { return <div />; }`,
    },
    // V7: export { a, b } — one specifier matches
    {
      filename: "src/merge-refs.ts",
      code: `const a = 1; function mergeRefs() {} export { a, mergeRefs };`,
    },
    // V8: export { a as b } — the exported name is what counts
    {
      filename: "src/merge-refs.ts",
      code: `const a = 1; export { a as mergeRefs };`,
    },
    // V9: export default function Name
    {
      filename: "src/option-card.tsx",
      code: `export default function OptionCard() {}`,
    },
    // V10: export default class Name
    {
      filename: "src/option-card.tsx",
      code: `export default class OptionCard {}`,
    },
    // V11: export default Identifier
    {
      filename: "src/merge-refs.ts",
      code: `function mergeRefs() {} export default mergeRefs;`,
    },
    // V12: export * from — a barrel cannot be judged
    {
      filename: "src/anything-at-all.ts",
      code: `export * from "./merge-refs";`,
    },
    // V13: no exports at all — an entry script
    {
      filename: "src/run-migration.ts",
      code: `doTheWork();`,
    },
    // V14: .mjs file
    {
      filename: "scripts/worktree-port.mjs",
      code: `export function worktreePort() {}`,
    },
    // V15: .stylex.ts — the stem stops at the first dot
    {
      filename: "src/button.stylex.ts",
      code: `export const button = stylex.create({});`,
    },
    // V16: a later export matches, not the first
    {
      filename: "src/focusable.ts",
      code: `export const FOCUSABLE_SELECTOR = "a"; export function focusable() {}`,
    },
    // V17: destructured export
    {
      filename: "src/merge-refs.ts",
      code: `export const { mergeRefs, other } = helpers;`,
    },
    // V18: CommonJS module.exports = Identifier
    {
      filename: "src/merge-refs.js",
      code: `function mergeRefs() {} module.exports = mergeRefs;`,
      languageOptions: { sourceType: "commonjs" },
    },
    // V19: CommonJS module.exports = object, shorthand and named keys
    {
      filename: "src/merge-refs.js",
      code: `module.exports = { other, mergeRefs: mergeRefsImpl };`,
      languageOptions: { sourceType: "commonjs" },
    },
    // V20: CommonJS exports.name
    {
      filename: "src/merge-refs.js",
      code: `exports.mergeRefs = () => {};`,
      languageOptions: { sourceType: "commonjs" },
    },
    // V21: CommonJS module.exports.name
    {
      filename: "src/merge-refs.js",
      code: `module.exports.mergeRefs = () => {};`,
      languageOptions: { sourceType: "commonjs" },
    },
    // V22: a CommonJS file with no exports — an entry script
    {
      filename: "src/run-migration.js",
      code: `doTheWork();`,
      languageOptions: { sourceType: "commonjs" },
    },
    // V23: a type-only file named after its interface
    {
      filename: "src/foo.ts",
      code: `export interface Foo {}`,
      languageOptions: { parser: tsParser },
    },
    // V24: the value export matches while an unrelated type is also exported
    {
      filename: "src/merge-refs.ts",
      code: `export interface Options {}\nexport function mergeRefs() {}`,
      languageOptions: { parser: tsParser },
    },
    // V25: export { type Foo, bar } — the value specifier is what counts
    {
      filename: "src/bar.ts",
      code: `type Foo = string;\nconst bar = 1;\nexport { type Foo, bar };`,
      languageOptions: { parser: tsParser },
    },
    // V26: a type-only file whose only export is an inline type specifier
    {
      filename: "src/foo.ts",
      code: `type Foo = string;\nexport { type Foo };`,
      languageOptions: { parser: tsParser },
    },
  ],

  invalid: [
    // I1: no export matches the stem
    {
      filename: "src/focusable.ts",
      code: `export function getFocusableElements() {}`,
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "focusable.ts",
            stem: "focusable",
            exports: "getFocusableElements",
          },
        },
      ],
    },
    // I2: the local name matches but the exported name does not
    {
      filename: "src/get-focusable-elements.ts",
      code: `const getFocusableElements = 1; export { getFocusableElements as getThem };`,
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "get-focusable-elements.ts",
            stem: "get-focusable-elements",
            exports: "getThem",
          },
        },
      ],
    },
    // I3: an anonymous default export names nothing
    {
      filename: "src/config-map.ts",
      code: `export default { a: 1 };`,
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "config-map.ts",
            stem: "config-map",
            exports: "none named",
          },
        },
      ],
    },
    // I4: .stylex.ts is stripped to its stem before comparing
    {
      filename: "src/button.stylex.ts",
      code: `export const tokens = stylex.create({});`,
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "button.stylex.ts",
            stem: "button",
            exports: "tokens",
          },
        },
      ],
    },
    // I5: reported once per file, on the first export statement
    {
      filename: "src/media-card.tsx",
      code: `export const one = 1;\nexport const two = 2;`,
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "media-card.tsx",
            stem: "media-card",
            exports: "one, two",
          },
          line: 1,
        },
      ],
    },
    // I6: .mjs file with a mismatched export
    {
      filename: "scripts/worktree-port.mjs",
      code: `export function readPort() {}`,
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "worktree-port.mjs",
            stem: "worktree-port",
            exports: "readPort",
          },
        },
      ],
    },
    // I7: an anonymous module.exports names nothing
    {
      filename: "src/merge-refs.js",
      code: `module.exports = function () {};`,
      languageOptions: { sourceType: "commonjs" },
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "merge-refs.js",
            stem: "merge-refs",
            exports: "none named",
          },
        },
      ],
    },
    // I8: a CommonJS bag names none of its members after the file
    {
      filename: "src/t-import.js",
      code: `module.exports = { createTImportTracker, isI18nModuleSource };`,
      languageOptions: { sourceType: "commonjs" },
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "t-import.js",
            stem: "t-import",
            exports: "createTImportTracker, isI18nModuleSource",
          },
        },
      ],
    },
    // I9: named after the exported interface, but the real (value) export
    // is a non-matching function — the type does not count
    {
      filename: "src/foo.ts",
      code: `export interface Foo {}\nexport function doSomethingElse() {}`,
      languageOptions: { parser: tsParser },
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "foo.ts",
            stem: "foo",
            exports: "doSomethingElse (type-only exports do not count: Foo)",
          },
        },
      ],
    },
    // I10: export { type Foo } plus a non-matching value export
    {
      filename: "src/foo.ts",
      code: `type Foo = string;\nexport { type Foo };\nexport function bar() {}`,
      languageOptions: { parser: tsParser },
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "foo.ts",
            stem: "foo",
            exports: "bar (type-only exports do not count: Foo)",
          },
        },
      ],
    },
    // I11: export default interface plus a non-matching value export
    {
      filename: "src/foo.ts",
      code: `export default interface Foo {}\nexport const somethingElse = 1;`,
      languageOptions: { parser: tsParser },
      errors: [
        {
          messageId: "noMatchingExport",
          data: {
            basename: "foo.ts",
            stem: "foo",
            exports: "somethingElse (type-only exports do not count: Foo)",
          },
        },
      ],
    },
  ],
});
