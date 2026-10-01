// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stylexPluginOptions } from "@tuja/babel-plugins/stylex-options";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const uiPackageRoot = path.resolve(appRoot, "../../packages/ui");

/**
 * The Babel plugin chain for the site's source, shared by `babel.config.js`
 * (Next and the StyleX PostCSS plugin) and `vitest.config.mts`, so tests
 * compile the source exactly as the build does.
 *
 * @param {object} options
 * @param {string | undefined} options.nodeEnv - Decides the StyleX plugin's
 *   `dev` and `test` modes.
 * @returns {import("@babel/core").PluginItem[]}
 */
export function babelPlugins({ nodeEnv }) {
  return [
    // Reads the original source, so it must run before anything rewrites it.
    "@tuja/babel-plugins/specimen-source",
    "@tuja/babel-plugins/i18n",
    [
      "module-resolver",
      {
        alias: {
          "#src": "./src",
        },
      },
    ],
    [
      "@tuja/babel-plugins/stylex-breakpoints",
      {
        rootDir: uiPackageRoot,
      },
    ],
    [
      "@stylexjs/babel-plugin",
      stylexPluginOptions({ rootDir: workspaceRoot, nodeEnv }),
    ],
  ];
}
