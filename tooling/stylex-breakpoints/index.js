// @ts-check

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 * @typedef {import('@babel/types')} BabelTypes
 */

/**
 * A Babel plugin for transforming breakpoints into static media queries.
 *
 * This plugin reads breakpoint values from `src/breakpoints.stylex.ts` (defined using
 * `stylex.defineConsts`) and transforms breakpoint references into media query strings.
 *
 * This provides a future-proof migration path: breakpoints are defined in StyleX format,
 * but this plugin handles media query ordering until StyleX natively supports it.
 *
 * @example
 *
 * The breakpoints plugin must be placed before the stylex plugin.
 *
 * ```js
 * // src/breakpoints.stylex.ts
 * export const breakpoints = stylex.defineConsts({
 *   sm: 320,
 *   md: 768,
 *   lg: 1080,
 *   xl: 2000,
 * });
 * ```
 *
 * This transforms `breakpoints.sm` into `"@media (min-width: 320px)"`.
 * Media query ordering is handled by this plugin using mobile-first approach.
 *
 * @param {Babel} babel - The Babel object.
 * @returns {import('@babel/core').PluginObj<PluginPass>} The plugin object.
 */
/**
 * Parse breakpoints from src/breakpoints.stylex.ts using Babel AST parsing
 * This function is called once at plugin initialization, not per-file.
 * @param {string} rootDir - The root directory of the project
 * @returns {{ [key: string]: string }}
 */
function parseBreakpointsFromFile(rootDir) {
  const breakpointsPath = path.join(rootDir, "src", "breakpoints.stylex.ts");

  if (!fs.existsSync(breakpointsPath)) {
    throw new Error(
      `Breakpoints file not found at ${breakpointsPath}. Expected src/breakpoints.stylex.ts to exist.`,
    );
  }

  const content = fs.readFileSync(breakpointsPath, "utf-8");

  // Parse the TypeScript file using Babel parser
  const ast = parser.parse(content, {
    sourceType: "module",
    plugins: ["typescript"],
  });

  /** @type {{ [key: string]: string }} */
  const breakpointsObj = {};

  // Traverse the AST to find the defineConsts call
  traverse(ast, {
    CallExpression(path) {
      const { node } = path;

      // Check if this is stylex.defineConsts()
      if (
        node.callee.type === "MemberExpression" &&
        node.callee.object.type === "Identifier" &&
        node.callee.object.name === "stylex" &&
        node.callee.property.type === "Identifier" &&
        node.callee.property.name === "defineConsts"
      ) {
        // Get the first argument (the object)
        const arg = node.arguments[0];
        if (arg && arg.type === "ObjectExpression") {
          // Extract all properties
          arg.properties.forEach((prop) => {
            if (
              prop.type === "ObjectProperty" &&
              prop.key.type === "Identifier" &&
              prop.value.type === "StringLiteral"
            ) {
              const key = prop.key.name;
              const value = prop.value.value;
              breakpointsObj[key] = value;
            }
          });
        }
      }
    },
  });

  if (Object.keys(breakpointsObj).length === 0) {
    throw new Error(
      `Could not parse breakpoints from ${breakpointsPath}. Expected stylex.defineConsts({ ... }) format.`,
    );
  }

  return breakpointsObj;
}

/**
 * @param {import('@babel/core')} babel
 * @param {{ rootDir?: string }} options
 * @returns {import('@babel/core').PluginObj}
 */
module.exports = function (babel, options) {
  const { types: t } = babel;

  // Parse breakpoints ONCE at plugin initialization (module scope)
  // This is shared across all files being compiled
  const rootDir = options.rootDir || process.cwd();
  const breakpoints = parseBreakpointsFromFile(rootDir);

  return {
    name: "stylex-breakpoints",
    manipulateOptions(_opts, _parserOpts) {
      // Ensure this plugin runs before StyleX by manipulating parse order
    },
    visitor: {
      CallExpression: {
        /** @param {import('@babel/traverse').NodePath<import('@babel/types').CallExpression>} path */
        enter(path) {
          if (!breakpoints || typeof breakpoints !== "object") {
            return;
          }

          const breakpointsConfig = breakpoints;

          // Check if this is a stylex.create/defineVars/defineConsts call
          if (
            !t.isMemberExpression(path.node.callee) ||
            !t.isIdentifier(path.node.callee.object, { name: "stylex" }) ||
            !(
              t.isIdentifier(path.node.callee.property, { name: "create" }) ||
              t.isIdentifier(path.node.callee.property, {
                name: "defineVars",
              }) ||
              t.isIdentifier(path.node.callee.property, {
                name: "defineConsts",
              })
            )
          ) {
            return;
          }

          const arg = path.node.arguments[0];
          if (!t.isObjectExpression(arg)) {
            return;
          }

          /** @param {import('@babel/types').ObjectExpression} objExpr */
          function processObjectExpression(objExpr) {
            objExpr.properties.forEach((prop) => {
              if (!t.isObjectProperty(prop)) {
                return;
              }

              if (
                t.isMemberExpression(prop.key) &&
                t.isIdentifier(prop.key.object) &&
                prop.key.object.name === "breakpoints" &&
                t.isIdentifier(prop.key.property)
              ) {
                const breakpointKey = prop.key.property.name;
                if (!(breakpointKey in breakpointsConfig)) {
                  throw new Error(
                    `Specified breakpoint ${breakpointKey} doesn't have a matching config`,
                  );
                }
                if (typeof breakpointsConfig[breakpointKey] !== "string") {
                  throw new Error(
                    `Breakpoint config for ${breakpointKey} is not a string`,
                  );
                }

                const mediaQuery = breakpointsConfig[breakpointKey];
                prop.key = t.stringLiteral(mediaQuery);
              }

              if (t.isObjectExpression(prop.value)) {
                // Recurse deeper for nested objects
                processObjectExpression(prop.value);
              }
            });
          }

          processObjectExpression(arg);
        },
      },
    },
  };
};
