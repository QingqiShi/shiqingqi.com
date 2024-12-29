// @ts-check

/**
 * @typedef {import('@babel/core')} Babel
 * @typedef {import('@babel/core').PluginPass} PluginPass
 */

/**
 * A Babel plugin for transforming breakpoints into static media queries.
 * This is a temporary hack until `stylex.defineConsts` is available https://github.com/facebook/stylex/issues/724
 *
 * This plugins allows you to define breakpoints in the babel config,
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
 * @remarks
 *
 * The plugins handles sparse breakpoints for you as well, for example if you specify `sm` and `lg`
 * but not `md` and `xl`:
 *
 * ```js
 * const styles = stylex.create({
 *   placeholder: {
 *     height: {
 *       default: "1rem",
 *       [breakpoints.sm]: "2rem",
 *       [breakpoints.lg]: "3rem",
 *     },
 *   },
 * };
 * ```
 *
 * The above will be transformed into the following, you can see, the ranges generated are mutually
 * exclusive and doesn't not create gaps:
 *
 * ```js
 * const styles = stylex.create({
 *   placeholder: {
 *     height: {
 *       default: "1rem",
 *       ["@media (min-width: 320px) and (max-width: 1079.9px)"]: "2rem",
 *       ["@media (min-width: 1080px)"]: "3rem",
 *     },
 *   },
 * };
 * ```
 *
 * @param {Babel} babel - The Babel object.
 * @returns {import('@babel/core').PluginObj<PluginPass & { opts: { breakpoints: { [key: string]: number }} }>} The plugin object.
 */
module.exports = function ({ types: t }) {
  /** @type {{ [key: string]: number } | null} */
  let breakpoints = null;

  return {
    name: "replace-breakpoints",
    pre() {
      breakpoints = this.opts.breakpoints;
    },
    visitor: {
      Program(path, state) {
        if (!breakpoints || typeof breakpoints !== "object") {
          throw new Error(
            "Invalid or missing `breakpoints` option. Expected an object."
          );
        }

        const breakpointsConfig = breakpoints;

        /** @param {babel.types.ObjectExpression} objExpr */
        function processObjectExpression(objExpr) {
          // Find defined breakpoint keys
          /** @type {string[]} */
          const definedBreakpointKeys = [];
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
                  `Specified breakpoint ${breakpointKey} doesn't have a matching config`
                );
              }
              if (typeof breakpointsConfig[breakpointKey] !== "number") {
                throw new Error(
                  `Breakpoint config for ${breakpointKey} is not a number`
                );
              }
              definedBreakpointKeys.push(breakpointKey);
            }
          });

          // Sort the defined keys based on their breakpoint value
          definedBreakpointKeys.sort(
            (a, b) => breakpointsConfig[a] - breakpointsConfig[b]
          );

          // Go through again to replace the media query
          objExpr.properties.forEach((prop) => {
            if (
              t.isObjectProperty(prop) &&
              t.isMemberExpression(prop.key) &&
              t.isIdentifier(prop.key.object) &&
              prop.key.object.name === "breakpoints" &&
              t.isIdentifier(prop.key.property)
            ) {
              const breakpointKey = prop.key.property.name;
              const minValue = breakpointsConfig[breakpointKey];

              // See if there exists a next breakpoint value for max range
              const index = definedBreakpointKeys.indexOf(breakpointKey);
              const maxBreakpointKey = definedBreakpointKeys[index + 1];
              const maxValue = maxBreakpointKey
                ? breakpointsConfig[maxBreakpointKey] - 0.1
                : null;

              const mediaQuery = maxValue
                ? `@media (min-width: ${minValue}px) and (max-width: ${maxValue}px)`
                : `@media (min-width: ${minValue}px)`;

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
              t.isIdentifier(innerPath.node.callee.property, { name: "create" })
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
