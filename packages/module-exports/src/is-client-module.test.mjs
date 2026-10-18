import { createRequire } from "node:module";
import { parse as babelParse } from "@babel/parser";
import { describe, expect, it } from "vitest";

import { findUseClientDirective, isClientModule } from "./is-client-module";

const require = createRequire(import.meta.url);
const tsParser = require("typescript-eslint").parser;

const parsers = {
  ESTree: (/** @type {string} */ code) =>
    tsParser.parseForESLint(code, {
      ecmaVersion: "latest",
      sourceType: "module",
    }).ast,
  Babel: (/** @type {string} */ code) =>
    babelParse(code, { sourceType: "module", plugins: ["typescript"] }).program,
};

const fixtures = [
  {
    name: '"use client" beside a component',
    code: `"use client";\nexport function Popover() {}`,
    directive: true,
    clientModule: true,
  },
  {
    name: '"use client" after another directive',
    code: `"use strict";\n"use client";\nexport function Popover() {}`,
    directive: true,
    clientModule: true,
  },
  {
    name: '"use client" after a statement',
    code: `import "./a";\n"use client";\nexport function Popover() {}`,
    directive: false,
    clientModule: false,
  },
  {
    name: "hook module with no directive",
    code: `export function useFoo() {}`,
    directive: false,
    clientModule: true,
  },
  {
    name: "component with no directive",
    code: `export function Popover() {}`,
    directive: false,
    clientModule: false,
  },
];

describe.each(fixtures)("$name", ({ code, directive, clientModule }) => {
  it.each(Object.entries(parsers))("%s", (_, parse) => {
    const program = parse(code);
    expect(findUseClientDirective(program) !== null).toBe(directive);
    expect(isClientModule(program)).toBe(clientModule);
  });
});
