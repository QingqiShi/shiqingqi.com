// @ts-check

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 */

/**
 * A Babel plugin for transforming breakpoints into static media queries.
 *
 * This plugin allows you to define breakpoints in the babel config and simply replaces
 * breakpoint references with their corresponding media query strings.
 *
 * @example
 *
 * The breakpoints plugin must be placed before the stylex plugin.
 *
 * ```js
 * module.exports = {
 *   plugins: [
 *     [
 *       "./tooling/stylex-breakpoints",
 *       {
 *         breakpoints: {
 *           sm: 320,
 *           md: 768,
 *           lg: 1080,
 *           xl: 2000,
 *         },
 *       },
 *     ],
 *     "@stylexjs/babel-plugin"
 *   ]
 * }
 * ```
 *
 * This transforms `breakpoints.sm` into `"@media (min-width: 320px)"`.
 * Media query ordering is handled by StyleX's enableMediaQueryOrder option.
 *
 * @param {Babel} babel - The Babel object.
 * @returns {import('@babel/core').PluginObj<PluginPass & { opts: { breakpoints: { [key: string]: number }} }>} The plugin object.
 */
module.exports = function ({ types: t }) {
  /** @type {{ [key: string]: number } | null} */
  let breakpoints = null;

  return {
    name: "stylex-breakpoints",
    pre() {
      breakpoints = this.opts.breakpoints;
    },
    visitor: {
      Program(path) {
        if (!breakpoints || typeof breakpoints !== "object") {
          throw new Error(
            "Invalid or missing `breakpoints` option. Expected an object.",
          );
        }

        const breakpointsConfig = breakpoints;

        /** @param {babel.types.ObjectExpression} objExpr */
        function processObjectExpression(objExpr) {
          objExpr.properties.forEach((prop) => {
            if (
              t.isObjectProperty(prop) &&
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
              if (typeof breakpointsConfig[breakpointKey] !== "number") {
                throw new Error(
                  `Breakpoint config for ${breakpointKey} is not a number`,
                );
              }

              const value = breakpointsConfig[breakpointKey];
              const mediaQuery = `@media (min-width: ${value}px)`;
              prop.key = t.stringLiteral(mediaQuery);
            }

            if (t.isObjectProperty(prop) && t.isObjectExpression(prop.value)) {
              // Recurse deeper for nested objects
              processObjectExpression(prop.value);
            }
          });
        }

        // Find stylex.create() calls
        path.traverse({
          CallExpression(innerPath) {
            if (
              t.isMemberExpression(innerPath.node.callee) &&
              t.isIdentifier(innerPath.node.callee.object, {
                name: "stylex",
              }) &&
              (t.isIdentifier(innerPath.node.callee.property, {
                name: "create",
              }) ||
                t.isIdentifier(innerPath.node.callee.property, {
                  name: "defineVars",
                }))
            ) {
              const arg = innerPath.node.arguments[0];

              if (t.isObjectExpression(arg)) {
                processObjectExpression(arg);
              }
            }
          },
        });
      },
    },
  };
};
