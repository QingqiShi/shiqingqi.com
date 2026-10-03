import { createRequire } from "node:module";
import { parseSync, transformSync, traverse, types } from "@babel/core";
import { describe, expect, it } from "vitest";
import { generateKey } from "./generate-key";

const require = createRequire(import.meta.url);

const i18nPluginPath = require.resolve("./index");
const reactCompilerPath = require.resolve("babel-plugin-react-compiler");

/**
 * Compile a module the way Next does: React Compiler is the first plugin in
 * the list, and the site's plugins come after it.
 * @param {string} code
 * @returns {string}
 */
function compile(code) {
  const result = transformSync(code, {
    filename: "card.tsx",
    parserOpts: { plugins: ["typescript", "jsx"] },
    plugins: [[reactCompilerPath, {}], i18nPluginPath],
    configFile: false,
    babelrc: false,
  });
  if (!result || result.code == null) {
    throw new Error("Transform returned no code");
  }
  return result.code;
}

/**
 * The identifiers that a React Compiler cache block compares, e.g.
 * `isExternal` and `_translations` in
 * `if ($[0] !== isExternal || $[1] !== _translations)`. A sentinel block,
 * which runs once and never again, compares none.
 * @param {types.Expression} test
 * @returns {string[] | null} null when the test is not a cache check
 */
function cacheKeysOf(test) {
  if (types.isLogicalExpression(test, { operator: "||" })) {
    const left = cacheKeysOf(test.left);
    const right = cacheKeysOf(test.right);
    return left && right ? [...left, ...right] : null;
  }
  if (
    types.isBinaryExpression(test) &&
    types.isMemberExpression(test.left) &&
    types.isIdentifier(test.left.object, { name: "$" })
  ) {
    return test.operator === "!==" && types.isIdentifier(test.right)
      ? [test.right.name]
      : [];
  }
  return null;
}

/**
 * Expect each call that the predicate matches to sit only in cache blocks
 * that compare every identifier the call reads, and to read at least one.
 * @param {string} code
 * @param {(call: types.CallExpression) => boolean} matches
 */
function expectCallsKeyedOnTheirInputs(code, matches) {
  const ast = parseSync(code, {
    filename: "card.js",
    parserOpts: { plugins: ["jsx"] },
    configFile: false,
    babelrc: false,
  });
  let found = 0;
  traverse(ast, {
    CallExpression(path) {
      if (!matches(path.node)) return;
      found += 1;
      const reads = path.node.arguments
        .filter((arg) => types.isIdentifier(arg))
        .map((arg) => arg.name);
      /** @type {string[][]} */
      const enclosingCacheKeys = [];
      for (let p = path.parentPath; p; p = p.parentPath) {
        const keys = p.isIfStatement() ? cacheKeysOf(p.node.test) : null;
        if (keys) enclosingCacheKeys.push(keys);
      }
      expect(enclosingCacheKeys, code).not.toHaveLength(0);
      expect(reads, code).not.toHaveLength(0);
      for (const keys of enclosingCacheKeys) {
        expect(keys, code).toEqual(expect.arrayContaining(reads));
      }
    },
  });
  expect(found, code).toBeGreaterThan(0);
}

/**
 * @param {string} en
 * @param {string} zh
 */
function isLookupOf(en, zh) {
  const translationKey = generateKey(en, zh);
  return (/** @type {types.CallExpression} */ call) =>
    call.arguments.some((arg) =>
      types.isStringLiteral(arg, { value: translationKey }),
    );
}

describe("i18n with React Compiler", () => {
  it("keys a cached lookup on the translations", () => {
    const output = compile(`
"use client";
import { t } from "#src/i18n";
export function Card({ isExternal }) {
  return (
    <span>
      {isExternal
        ? t({ en: "External", zh: "外部" })
        : t({ en: "Internal", zh: "内部" })}
    </span>
  );
}
`);

    expectCallsKeyedOnTheirInputs(output, isLookupOf("External", "外部"));
    expectCallsKeyedOnTheirInputs(output, isLookupOf("Internal", "内部"));
  });

  it("does not cache a lookup with no other input forever", () => {
    const output = compile(`
"use client";
import { t } from "#src/i18n";
export function Title() {
  return <h1>{t({ en: "Title", zh: "标题" })}</h1>;
}
`);

    expectCallsKeyedOnTheirInputs(output, isLookupOf("Title", "标题"));
  });

  it("keys a cached helper call on the translations", () => {
    const output = compile(`
"use client";
import { t } from "#src/i18n";
function getLabel(kind) {
  return kind === "movie"
    ? t({ en: "Movie", zh: "电影" })
    : t({ en: "Show", zh: "剧集" });
}
export function Badge({ kind }) {
  return <span aria-label={getLabel(kind)} />;
}
`);

    expectCallsKeyedOnTheirInputs(output, (call) =>
      types.isIdentifier(call.callee, { name: "getLabel" }),
    );
    expect(output).toMatch(/getLabel\(_translations\d*, kind\)/);
  });
});
