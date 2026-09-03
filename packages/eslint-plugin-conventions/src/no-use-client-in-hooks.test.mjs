import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
// `@typescript-eslint/parser` is only reachable through the `typescript-eslint`
// meta package's own node_modules, so go through its `parser` export instead
// of requiring the subpackage directly.
const tsParser = require("typescript-eslint").parser;
const rule = require("./no-use-client-in-hooks");

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
ruleTester.run("no-use-client-in-hooks", rule, {
  valid: [
    // V1: no directive, hooks only
    {
      filename: "src/use-foo.ts",
      code: `export function useFoo() {}`,
    },
    // V2: directive plus a component export
    {
      filename: "src/popover.tsx",
      code: `"use client";\n\nexport function Popover() {}`,
    },
    // V3: directive plus a hook and a non-hook value export
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\nexport function useFoo() {}\nexport const CONSTANT = 1;`,
    },
    // V4: directive plus `export * from` — a barrel cannot be judged
    {
      filename: "src/index.ts",
      code: `"use client";\n\nexport * from "./use-foo";`,
    },
    // V5: directive plus an anonymous default export
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\nexport default function () {}`,
    },
    // V6: directive plus no exports at all
    {
      filename: "src/entry.ts",
      code: `"use client";\n\ndoTheWork();`,
    },
    // V7: a directive that is not "use client"
    {
      filename: "src/use-foo.ts",
      code: `"use strict";\n\nexport function useFoo() {}`,
    },
    // V8: "use client" outside the directive prologue — not a directive
    {
      filename: "src/use-foo.ts",
      code: `import { x } from "./x";\n"use client";\nexport function useFoo() {}`,
    },
  ],

  invalid: [
    // I1: single hook, directive and blank line removed
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\nexport function useFoo() {}`,
      output: `export function useFoo() {}`,
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo" },
        },
      ],
    },
    // I3: export const hook
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\nexport const useFoo = () => {};`,
      output: `export const useFoo = () => {};`,
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo" },
        },
      ],
    },
    // I4: multiple hooks
    {
      filename: "src/hooks.ts",
      code: `"use client";\n\nexport function useFoo() {}\nexport function useBar() {}`,
      output: `export function useFoo() {}\nexport function useBar() {}`,
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo, useBar" },
        },
      ],
    },
    // I5: export { useFoo, useBar } specifier form
    {
      filename: "src/hooks.ts",
      code: `"use client";\n\nfunction useFoo() {}\nfunction useBar() {}\nexport { useFoo, useBar };`,
      output: `function useFoo() {}\nfunction useBar() {}\nexport { useFoo, useBar };`,
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo, useBar" },
        },
      ],
    },
    // I6: export default function useFoo() {}
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\nexport default function useFoo() {}`,
      output: `export default function useFoo() {}`,
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo" },
        },
      ],
    },
    // I7: hook plus `export type` and `export interface` — both ignored (TS parser)
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\nexport type Foo = string;\nexport interface Bar {}\nexport function useFoo() {}`,
      output: `export type Foo = string;\nexport interface Bar {}\nexport function useFoo() {}`,
      languageOptions: { parser: tsParser },
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo" },
        },
      ],
    },
    // I8: export { type Foo, useFoo } — inline type specifier ignored (TS parser)
    {
      filename: "src/use-foo.ts",
      code: `"use client";\n\ntype Foo = string;\nfunction useFoo() {}\nexport { type Foo, useFoo };`,
      output: `type Foo = string;\nfunction useFoo() {}\nexport { type Foo, useFoo };`,
      languageOptions: { parser: tsParser },
      errors: [
        {
          messageId: "notASeam",
          data: { exports: "useFoo" },
        },
      ],
    },
  ],
});
