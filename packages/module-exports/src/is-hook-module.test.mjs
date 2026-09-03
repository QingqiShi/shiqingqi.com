import { createRequire } from "node:module";
import { parse as babelParse } from "@babel/parser";
import { describe, expect, it } from "vitest";

import { isHookModule } from "./is-hook-module";
import { valueExportNamesOf } from "./value-export-names-of";

const require = createRequire(import.meta.url);
// `@typescript-eslint/parser` is only reachable through the `typescript-eslint`
// meta package's own node_modules, so go through its `parser` export instead
// of requiring the subpackage directly.
const tsParser = require("typescript-eslint").parser;

/**
 * @param {string} code
 * @returns {any}
 */
function estreeProgramOf(code) {
  return tsParser.parseForESLint(code, {
    ecmaVersion: "latest",
    sourceType: "module",
    ecmaFeatures: { jsx: true },
  }).ast;
}

/**
 * @param {string} code
 * @returns {any}
 */
function babelProgramOf(code) {
  return babelParse(code, {
    sourceType: "module",
    plugins: ["typescript", "jsx"],
  }).program;
}

const fixtures = [
  {
    name: "hook-only function",
    code: `export function useFoo() {}`,
    hookModule: true,
    names: ["useFoo"],
  },
  {
    name: "hook-only const arrow",
    code: `export const useFoo = () => {};`,
    hookModule: true,
    names: ["useFoo"],
  },
  {
    name: "two hooks",
    code: `export function useFoo() {}\nexport function useBar() {}`,
    hookModule: true,
    names: ["useFoo", "useBar"],
  },
  {
    name: "hook via export { useFoo, useBar }",
    code: `function useFoo() {}\nfunction useBar() {}\nexport { useFoo, useBar };`,
    hookModule: true,
    names: ["useFoo", "useBar"],
  },
  {
    name: "export default function useFoo",
    code: `export default function useFoo() {}`,
    hookModule: true,
    names: ["useFoo"],
  },
  {
    name: "export default useFoo identifier",
    code: `function useFoo() {}\nexport default useFoo;`,
    hookModule: true,
    names: ["useFoo"],
  },
  {
    name: "hook plus export interface/export type/export { type Foo }",
    code: `type Baz = number;\nexport type Foo = string;\nexport interface Bar {}\nfunction useFoo() {}\nexport { type Baz, useFoo };`,
    hookModule: true,
    names: ["useFoo"],
  },
  {
    name: "hook plus non-hook const",
    code: `export function useFoo() {}\nexport const CONSTANT = 1;`,
    hookModule: false,
    names: ["useFoo", "CONSTANT"],
  },
  {
    name: "hook plus export * from",
    code: `export function useFoo() {}\nexport * from "./other";`,
    hookModule: false,
    names: null,
  },
  {
    name: "anonymous default export",
    code: `export default function () {}`,
    hookModule: false,
    names: ["default"],
  },
  {
    name: "no exports",
    code: `doTheWork();`,
    hookModule: false,
    names: [],
  },
  {
    name: "export const { useA, useB } = x destructured",
    code: `export const { useA, useB } = x;`,
    hookModule: true,
    names: ["useA", "useB"],
  },
  {
    name: "export enum beside a hook",
    code: `export enum Foo { A, B }\nexport function useBar() {}`,
    hookModule: false,
    names: ["Foo", "useBar"],
  },
  {
    name: "export declare function beside a hook",
    code: `export declare function useFoo(): void;\nexport function useBar() {}`,
    hookModule: true,
    names: ["useBar"],
  },
  {
    name: "component only",
    code: `export function Popover() {}`,
    hookModule: false,
    names: ["Popover"],
  },
];

describe.each(fixtures)("$name", ({ code, hookModule, names }) => {
  it("ESTree (typescript-eslint)", () => {
    const program = estreeProgramOf(code);
    expect(valueExportNamesOf(program)).toEqual(names);
    expect(isHookModule(program)).toBe(hookModule);
  });

  it("Babel (@babel/parser)", () => {
    const program = babelProgramOf(code);
    expect(valueExportNamesOf(program)).toEqual(names);
    expect(isHookModule(program)).toBe(hookModule);
  });
});
