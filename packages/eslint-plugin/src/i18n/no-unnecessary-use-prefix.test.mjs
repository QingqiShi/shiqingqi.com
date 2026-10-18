import { RuleTester } from "eslint";
import tsEslint from "typescript-eslint";
import rule from "./no-unnecessary-use-prefix.mjs";

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsEslint.parser,
    ecmaVersion: "latest",
    sourceType: "module",
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

const error = { messageId: "default" };

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("no-unnecessary-use-prefix", rule, {
  valid: [
    // V1: a hook that calls a hook
    {
      code: `
        import { useState } from "react";
        export function useCount() {
          const [count] = useState(0);
          return count;
        }
      `,
    },
    // V2: t() in a module that exports only hooks
    {
      code: `
        import { t } from "#src/i18n.ts";
        export function useLabel() {
          return t({ en: "Hello", zh: "你好" });
        }
      `,
    },
    // V3: t() in a "use client" module that also exports a component
    {
      code: `
        "use client";
        import { t } from "#src/i18n.ts";
        function useLabel() {
          return t({ en: "Hello", zh: "你好" });
        }
        export function Greeting() {
          return useLabel();
        }
      `,
    },
    // V4: t() in an arrow function hook
    {
      code: `
        import { t } from "#src/i18n.ts";
        export const useLabel = () => t({ en: "Hello", zh: "你好" });
      `,
    },
    // V5: t() in a callback belongs to the nearest enclosing hook
    {
      code: `
        import { t } from "#src/i18n.ts";
        export function useLabels(items) {
          return items.map((item) => t({ en: "Item", zh: "项目" }) + item);
        }
      `,
    },
    // V6: an aliased t import
    {
      code: `
        import { t as translate } from "#src/i18n.ts";
        export function useLabel() {
          return translate({ en: "Hello", zh: "你好" });
        }
      `,
    },
  ],
  invalid: [
    // I1: no hook call and no t()
    {
      code: `
        export function useDouble(value) {
          return value * 2;
        }
      `,
      errors: [error],
    },
    // I2: t() makes the other hook a hook, not this one
    {
      code: `
        import { t } from "#src/i18n.ts";
        export function useLabel() {
          return t({ en: "Hello", zh: "你好" });
        }
        export function useDouble(value) {
          return value * 2;
        }
      `,
      errors: [{ ...error, line: 6 }],
    },
    // I3: out of a client module, t() becomes a lookup that calls no hook
    {
      code: `
        import { t } from "#src/i18n.ts";
        export function useLabel() {
          return t({ en: "Hello", zh: "你好" });
        }
        export const LABEL_LENGTH = 5;
      `,
      errors: [error],
    },
    // I4: a function named t that is not the i18n t
    {
      code: `
        import { t } from "./other.ts";
        export function useLabel() {
          return t("Hello");
        }
      `,
      errors: [error],
    },
    // I5: t() in a nested component belongs to that component, not the hook
    {
      code: `
        import { t } from "#src/i18n.ts";
        export function useGreeting() {
          function Greeting() {
            return t({ en: "Hello", zh: "你好" });
          }
          return Greeting;
        }
      `,
      errors: [error],
    },
  ],
});
