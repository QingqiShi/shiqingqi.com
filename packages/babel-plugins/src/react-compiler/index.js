// @ts-check

/**
 * The options React Compiler runs with wherever the repo compiles React: the
 * Next apps' `reactCompiler` setting, the Vitest configs, and the
 * `@tuja/component-tinker` build. The code has no manual memoization, so a
 * component or hook the compiler skips loses its memoization without a trace.
 * `all_errors` makes such a skip fail the build instead.
 */
const reactCompilerOptions = Object.freeze({
  panicThreshold: /** @type {const} */ ("all_errors"),
});

/**
 * @typedef {Parameters<typeof import("@rolldown/plugin-babel").default>[0]} BabelOptions
 */

/**
 * @typedef {object} VitePlugin
 * @property {string} name
 * @property {"pre"} enforce
 * @property {(code: string, id: string) => Promise<{ code: string, map: unknown } | null>} transform
 */

/**
 * React Compiler for a Vite build or a Vitest config, followed by the caller's
 * Babel transforms. Both passes take the files that `include` matches.
 *
 * The compiler pass comes before every other transform, so the compiler reads
 * the original source, as in Next. It runs on Babel 7, because compiler 1.0.0
 * cannot compile a destructured default (`{ size = 3 }`) under Babel 8. It
 * only parses TypeScript and JSX and prints them back, so every other
 * transform stays on the caller's Babel 8 chain.
 *
 * @param {object} options
 * @param {RegExp} options.include - The files to compile, matched against
 *   the absolute path.
 * @param {import("@babel/core").PluginItem[]} [options.sourcePlugins] -
 *   Plugins that run in the compiler pass, for a plugin that must also read
 *   the original source.
 * @param {Omit<BabelOptions, "include">} [options.babel] - The Babel 8
 *   transforms that run after the compiler pass, as `@rolldown/plugin-babel`
 *   options. Without them, the compiler pass is the only plugin.
 * @returns {(VitePlugin | ReturnType<typeof import("@rolldown/plugin-babel").default>)[]}
 */
function reactCompilerVitePlugins({ include, sourcePlugins = [], babel }) {
  const compilerPass = reactCompilerVitePlugin({
    include,
    plugins: sourcePlugins,
  });
  if (!babel) return [compilerPass];
  /** @type {typeof import("@rolldown/plugin-babel")} */
  const rolldownBabel = require("@rolldown/plugin-babel");
  return [compilerPass, rolldownBabel.default({ ...babel, include })];
}

/**
 * React Compiler as a Babel plugin item, with {@link reactCompilerOptions}.
 * It must come first in a plugin list, as in Next, so it reads the source
 * before another plugin rewrites it.
 *
 * @returns {[string, Record<string, unknown>]}
 */
function reactCompilerPlugin() {
  return [
    require.resolve("babel-plugin-react-compiler"),
    { ...reactCompilerOptions },
  ];
}

/**
 * @param {object} options
 * @param {RegExp} options.include
 * @param {import("@babel/core").PluginItem[]} options.plugins
 * @returns {VitePlugin}
 */
function reactCompilerVitePlugin({ include, plugins }) {
  const babel = require("@babel/core-7");
  const withCompiler = [reactCompilerPlugin(), ...plugins];
  return {
    name: "@tuja/babel-plugins/react-compiler",
    enforce: "pre",
    async transform(code, id) {
      const [filename] = id.split("?");
      if (!include.test(filename)) return null;
      const passPlugins = mayHaveComponentOrHook(code, filename)
        ? withCompiler
        : plugins;
      if (passPlugins.length === 0) return null;
      const result = await babel.transformAsync(code, {
        filename,
        babelrc: false,
        configFile: false,
        sourceMaps: true,
        parserOpts: { plugins: parserPlugins(filename) },
        plugins: passPlugins,
      });
      if (!result?.code) return null;
      return { code: result.code, map: result.map };
    },
  };
}

/**
 * A cheap text form of the gate Next applies before it runs the compiler.
 * The compiler only compiles a function that calls a hook or makes JSX, so a
 * file with no `use` and no JSX cannot have a component or hook.
 *
 * @param {string} code
 * @param {string} filename
 */
function mayHaveComponentOrHook(code, filename) {
  return (
    /\buse/.test(code) || (/\.[jt]sx$/.test(filename) && code.includes("<"))
  );
}

/**
 * @param {string} filename
 * @returns {("jsx" | "typescript")[]}
 */
function parserPlugins(filename) {
  if (/\.tsx$/.test(filename)) return ["typescript", "jsx"];
  if (/\.[cm]?ts$/.test(filename)) return ["typescript"];
  return ["jsx"];
}

module.exports = {
  reactCompilerOptions,
  reactCompilerVitePlugins,
};
