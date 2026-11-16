// @ts-check
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stylexPlugins } from "@tuja/babel-plugins/stylex-plugins";

const appRoot = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(appRoot, "../..");
const uiPackageRoot = path.resolve(appRoot, "../../packages/ui");

/**
 * The Babel plugin chain for the app's source, shared by `babel.config.js`
 * (Next) and `postcss.config.js` (StyleX CSS extraction).
 *
 * @param {object} options
 * @param {boolean} [options.dev] - The StyleX plugin's `dev` mode.
 * @param {boolean} [options.test] - The StyleX plugin's `test` mode.
 * @returns {import("@babel/core").PluginItem[]}
 */
export function babelPlugins({ dev, test }) {
  return [
    "@tuja/babel-plugins/i18n",
    ...stylexExtractionPlugins({ dev, test }),
  ];
}

/**
 * The part of {@link babelPlugins} that decides the StyleX CSS: the `#src`
 * alias, so StyleX can resolve `.stylex` imports that use it, and the StyleX
 * plugins.
 *
 * @param {object} options
 * @param {boolean} [options.dev] - The StyleX plugin's `dev` mode.
 * @param {boolean} [options.test] - The StyleX plugin's `test` mode.
 * @returns {import("@babel/core").PluginItem[]}
 */
export function stylexExtractionPlugins({ dev, test }) {
  return [
    [
      "module-resolver",
      {
        alias: {
          "#src": "./src",
        },
      },
    ],
    ...stylexPlugins({
      rootDir: workspaceRoot,
      breakpointsRootDir: uiPackageRoot,
      dev,
      test,
    }),
  ];
}
