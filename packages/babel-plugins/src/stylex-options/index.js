// @ts-check

/**
 * The options `@stylexjs/babel-plugin` runs with wherever the site's StyleX is
 * compiled. They live in one place, because a different option set yields
 * different class names and a different rule order.
 *
 * @param {object} options
 * @param {string} options.rootDir - The directory `unstable_moduleResolution`
 *   resolves a `.stylex.ts` import against. The monorepo root.
 * @param {boolean} [options.dev] - The plugin's `dev` mode. A development
 *   build sets it.
 * @param {boolean} [options.test] - The plugin's `test` mode. A test run sets
 *   it.
 * @returns {Record<string, unknown>} The plugin's options object.
 */
function stylexPluginOptions({ rootDir, dev = false, test = false }) {
  return {
    sxPropName: "css",
    dev,
    test,
    runtimeInjection: false,
    genConditionalClasses: true,
    treeshakeCompensation: true,
    styleResolution: "property-specificity",
    enableMediaQueryOrder: true,
    unstable_moduleResolution: {
      type: "commonJS",
      rootDir,
    },
  };
}

module.exports = { stylexPluginOptions };
