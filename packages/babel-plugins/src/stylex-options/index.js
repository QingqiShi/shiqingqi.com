// @ts-check

/**
 * The options `@stylexjs/babel-plugin` runs with wherever the site's StyleX is
 * compiled: the app's Babel config, and the `@tuja/component-tinker` adapter.
 * They belong together, because a different option set yields different class
 * names and a different rule order, and that adapter must reproduce the app's
 * CSS exactly.
 *
 * @param {object} options
 * @param {string} options.rootDir - The directory `unstable_moduleResolution`
 *   resolves a `.stylex.ts` import against. The monorepo root.
 * @param {string | undefined} options.nodeEnv - The build's `NODE_ENV`, which
 *   decides the plugin's `dev` and `test` modes.
 * @returns {Record<string, unknown>} The plugin's options object.
 */
function stylexPluginOptions({ rootDir, nodeEnv }) {
  return {
    sxPropName: "css",
    dev: nodeEnv === "development",
    test: nodeEnv === "test",
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
