import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import stylexBabelPlugin from "@stylexjs/babel-plugin";
import { stylexPluginOptions } from "@tuja/babel-plugins/stylex-options";
import {
  designSystemSources,
  monorepoRoot,
  presetSources,
  uiRoot,
} from "./design-system-sources.mjs";

const nodeRequire = createRequire(import.meta.url);

// `@stylexjs/postcss-plugin` makes the shipped CSS with its own Babel 7.
// The Babel 8 here makes CSS that is identical byte for byte, so the
// playground shows what the app ships.
const babel = nodeRequire("@babel/core");

// Babel resolves a preset or plugin name against the working directory, and
// the build runs from the monorepo root, so every name is resolved here first.
const preset = (name) => nodeRequire.resolve(name);

// The same options `apps/web/babel.config.js` gives the StyleX plugin, so the
// CSS and the class names here are the ones the app ships.
const stylexOptions = stylexPluginOptions({
  rootDir: monorepoRoot,
  nodeEnv: "production",
});

function toCommonJs(code, filename) {
  return babel.transformSync(code, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    plugins: [preset("@babel/plugin-transform-modules-commonjs")],
  }).code;
}

/**
 * Runs one CommonJS module graph held in memory. Bare specifiers fall through
 * to this package's own dependencies, so `@stylexjs/stylex` can be swapped for
 * a shim that reports a token's authored value in place of its compiled name.
 */
function createModuleGraph(modules, resolveBare) {
  const cache = new Map();

  function load(absPath) {
    const cached = cache.get(absPath);
    if (cached) return cached.exports;

    const code = modules.get(absPath);
    if (code === undefined) {
      throw new Error(`No compiled module for ${absPath}`);
    }

    const module = { exports: {} };
    cache.set(absPath, module);

    const dirname = path.dirname(absPath);
    const requireFn = (specifier) => {
      if (specifier.startsWith(".")) {
        return load(path.resolve(dirname, specifier));
      }
      return resolveBare(specifier);
    };

    const run = new Function(
      "exports",
      "require",
      "module",
      "__filename",
      "__dirname",
      code,
    );
    run(module.exports, requireFn, module, absPath, dirname);
    return module.exports;
  }

  return load;
}

function identity(value) {
  return value;
}

// `stylex.types.*` only marks a value's CSS type, so the authored value passes
// straight through.
const typeShim = new Proxy({}, { get: () => identity });

const stylexShim = {
  defineVars: identity,
  defineConsts: identity,
  create: identity,
  keyframes: () => "keyframes",
  types: typeShim,
  firstThatWorks: (...values) => values,
};

function transformWithStylex(filename) {
  const breakpointsPlugin = nodeRequire.resolve(
    "@tuja/babel-plugins/stylex-breakpoints",
  );
  const source = fs.readFileSync(filename, "utf8");
  const result = babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    presets: [preset("@babel/preset-typescript")],
    plugins: [
      [breakpointsPlugin, { rootDir: uiRoot }],
      [stylexBabelPlugin, stylexOptions],
    ],
  });
  return { code: result.code, rules: result.metadata.stylex ?? [] };
}

function transformWithoutStylex(filename) {
  const source = fs.readFileSync(filename, "utf8");
  return babel.transformSync(source, {
    filename,
    babelrc: false,
    configFile: false,
    sourceType: "module",
    presets: [preset("@babel/preset-typescript")],
  }).code;
}

/**
 * Compiles every design-system source three times: once through the StyleX
 * plugin, which yields the CSS rules and the compiled var and class names,
 * once with StyleX shimmed out, which yields the values as they are authored,
 * and once with the preset sources shimmed but the tokens compiled, which
 * yields each preset declaration as the `var()` reference behind it.
 */
export function compileDesignSystem() {
  const files = designSystemSources();
  const presetFiles = new Set(presetSources());

  const compiledModules = new Map();
  const authoredModules = new Map();
  const rules = [];

  for (const file of files) {
    const { code, rules: fileRules } = transformWithStylex(file);
    compiledModules.set(file, toCommonJs(code, file));
    authoredModules.set(file, toCommonJs(transformWithoutStylex(file), file));
    rules.push(...fileRules);
  }

  const resolvedModules = new Map(
    files.map((file) => [
      file,
      presetFiles.has(file)
        ? authoredModules.get(file)
        : compiledModules.get(file),
    ]),
  );

  const loadCompiled = createModuleGraph(compiledModules, (specifier) =>
    nodeRequire(specifier),
  );
  const shimStylex = (specifier) => {
    if (specifier === "@stylexjs/stylex") return stylexShim;
    return nodeRequire(specifier);
  };
  const loadAuthored = createModuleGraph(authoredModules, shimStylex);
  const loadResolved = createModuleGraph(resolvedModules, shimStylex);

  const css = stylexBabelPlugin.processStylexRules(rules, {
    useLayers: true,
  });

  return { css, loadCompiled, loadAuthored, loadResolved };
}
