import { createRequire } from "node:module";
import { RuleTester } from "eslint";

const require = createRequire(import.meta.url);
// `@typescript-eslint/parser` is only reachable through the `typescript-eslint`
// meta package's own node_modules, so go through its `parser` export instead
// of requiring the subpackage directly.
const tsParser = require("typescript-eslint").parser;
const rule = require("./no-single-use-literal-alias");

const ruleTester = new RuleTester({
  languageOptions: {
    parser: tsParser,
    ecmaVersion: "latest",
    sourceType: "module",
  },
});

// RuleTester.run registers its own describe/it blocks,
// so call it at the top level (not inside an it() block).
ruleTester.run("no-single-use-literal-alias", rule, {
  valid: [
    // V1: two uses — the alias is a single source of truth
    `type Tone = "default" | "muted";
interface Props {
  tone?: Tone;
}
export function pick(tone: Tone) {}`,

    // V2: exported alias with one local use
    `export type Tone = "default" | "muted";
interface Props {
  tone?: Tone;
}`,

    // V3: body is not a literal type
    `type Handler = () => void;
interface Props {
  onPick?: Handler;
}`,

    // V4: union body with a type-reference member is not a literal body
    `import type { Base } from "./base";
type Extended = Base | "c";
interface Props {
  value?: Extended;
}`,

    // V5: zero uses — the unused-vars rules own that case
    `type Tone = "default" | "muted";`,

    // V6: template literal type with interpolation references another type
    `type Key = \`item-\${string}\`;
interface Props {
  key?: Key;
}`,

    // V7: an alias with type parameters is never inlined
    `type Loose<T> = "a" | "b";
interface Props {
  value?: Loose<string>;
}`,

    // V8: the only use is an export specifier, so the alias leaves the file
    `type Tone = "default" | "muted";
export { type Tone };`,
  ],

  invalid: [
    // I1: string union used once in a props interface
    {
      code: `type Tone = "default" | "muted";

interface Props {
  tone?: Tone;
}`,
      output: `interface Props {
  tone?: "default" | "muted";
}`,
      errors: [{ messageId: "inlineIt", data: { name: "Tone" } }],
    },

    // I2: single literal used once in a function parameter
    {
      code: `type Mode = "wide";
export function layout(mode: Mode) {}`,
      output: `export function layout(mode: "wide") {}`,
      errors: [{ messageId: "inlineIt", data: { name: "Mode" } }],
    },

    // I3: number literals with a null member
    {
      code: `type Step = 1 | 2 | null;
export const step: Step = null;`,
      output: `export const step: 1 | 2 | null = null;`,
      errors: [{ messageId: "inlineIt", data: { name: "Step" } }],
    },

    // I4: a union inlined into an array type gets parentheses
    {
      code: `type Letter = "a" | "b";
export type Letters = Letter[];`,
      output: `export type Letters = ("a" | "b")[];`,
      errors: [{ messageId: "inlineIt", data: { name: "Letter" } }],
    },

    // I5: a union inlined into a union stays bare
    {
      code: `type Letter = "a" | "b";
export type Extended = Letter | "c";`,
      output: `export type Extended = "a" | "b" | "c";`,
      errors: [{ messageId: "inlineIt", data: { name: "Letter" } }],
    },

    // I5a: a union inlined into an intersection gets parentheses
    {
      code: `type Letter = "a" | "b";
export type Branded = Letter & string;`,
      output: `export type Branded = ("a" | "b") & string;`,
      errors: [{ messageId: "inlineIt", data: { name: "Letter" } }],
    },

    // I5b: a union inlined under a type operator gets parentheses
    {
      code: `type Letter = "a" | "b";
export type Keys = keyof Letter;`,
      output: `export type Keys = keyof ("a" | "b");`,
      errors: [{ messageId: "inlineIt", data: { name: "Letter" } }],
    },

    // I5c: a union inlined as an indexed-access object gets parentheses
    {
      code: `type Letter = "a" | "b";
export type Len = Letter["length"];`,
      output: `export type Len = ("a" | "b")["length"];`,
      errors: [{ messageId: "inlineIt", data: { name: "Letter" } }],
    },

    // I5d: a union inlined as an indexed-access index stays bare
    {
      code: `type Letter = "a" | "b";
export type Value = { a: 1; b: 2 }[Letter];`,
      output: `export type Value = { a: 1; b: 2 }["a" | "b"];`,
      errors: [{ messageId: "inlineIt", data: { name: "Letter" } }],
    },

    // I6: a leading comment blocks the fix so it is not dropped
    {
      code: `// The tones mirror the design tokens.
type Tone = "default" | "muted";

interface Props {
  tone?: Tone;
}`,
      output: null,
      errors: [{ messageId: "inlineIt", data: { name: "Tone" } }],
    },

    // I7: a trailing same-line comment blocks the fix too
    {
      code: `type Tone = "default" | "muted"; // keep in sync with tokens

interface Props {
  tone?: Tone;
}`,
      output: null,
      errors: [{ messageId: "inlineIt", data: { name: "Tone" } }],
    },

    // I8: a run of aliases. Each report's fix merges into one span from the
    // declaration to the reference, so the spans overlap and one fix pass
    // applies only the first; `eslint --fix` converges over its later passes.
    {
      code: `type El = "p" | "span";
type Wrap = "balance" | "pretty";

interface Props {
  as?: El;
  wrap?: Wrap;
}`,
      output: `type Wrap = "balance" | "pretty";

interface Props {
  as?: "p" | "span";
  wrap?: Wrap;
}`,
      errors: [
        { messageId: "inlineIt", data: { name: "El" } },
        { messageId: "inlineIt", data: { name: "Wrap" } },
      ],
    },
  ],
});
