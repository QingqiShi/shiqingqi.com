// @ts-check

const { stylexPluginOptions } = require("../stylex-options");

/**
 * The StyleX part of a Babel plugin chain: `stylex-breakpoints`, then
 * `@stylexjs/babel-plugin` with the shared options. Every build that compiles
 * the site's StyleX takes the pair from here, so none can drop the
 * breakpoints plugin, run it in the wrong order, or pass other options.
 *
 * Each plugin is a resolved path, so the chain works from any working
 * directory and from any package that does not depend on the plugins itself.
 *
 * @param {object} options
 * @param {string} options.rootDir - The directory `unstable_moduleResolution`
 *   resolves a `.stylex.ts` import against. The monorepo root.
 * @param {string} options.breakpointsRootDir - The package that owns
 *   `src/breakpoints.stylex.ts`.
 * @param {string | undefined} options.nodeEnv - The build's `NODE_ENV`, which
 *   decides the StyleX plugin's `dev` and `test` modes.
 * @returns {[string, Record<string, unknown>][]} The two plugin items, in
 *   the order they must run.
 */
function stylexPlugins({ rootDir, breakpointsRootDir, nodeEnv }) {
  return [
    [require.resolve("../stylex-breakpoints"), { rootDir: breakpointsRootDir }],
    [
      require.resolve("@stylexjs/babel-plugin"),
      stylexPluginOptions({ rootDir, nodeEnv }),
    ],
  ];
}

module.exports = { stylexPlugins };
