// @ts-check

import stylexBabelPlugin from "@stylexjs/babel-plugin";

/**
 * Turns the rules that the StyleX plugin from `stylexPlugins()` collects into
 * CSS, for a build that runs Babel itself instead of through a bundler plugin.
 */
export const { processStylexRules } = stylexBabelPlugin;
