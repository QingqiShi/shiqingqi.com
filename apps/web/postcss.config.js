const { createRequire } = require("node:module");
const path = require("node:path");
// `postcss-import`'s own resolver, so the fallback below is additive rather
// than a replacement. It is reached through the package's file layout because
// `postcss-import` publishes no `exports` map.
const resolveCssId = require("postcss-import/lib/resolve-id");

// Node's resolver, reached through `createRequire` so the bundler does not try
// to statically analyse a `require.resolve` call whose specifier is a runtime
// value — it cannot follow one, and warns about it on every build.
const nodeRequire = createRequire(__filename);

module.exports = {
  plugins: {
    "postcss-import": {
      // `postcss-import` resolves bare specifiers with a legacy node_modules
      // walk that ignores a package's `exports` map, so `@import "pkg/thing.css"`
      // fails whenever the package maps its CSS entry points to a different
      // path on disk (LyteNyte Grid does this, and its CSS files `@import`
      // each other across packages).
      //
      // Try the default resolver first — it is CSS-aware in ways Node's is
      // not (`.css` extensions, `pkg.style` → `pkg.main`, an `index.css`
      // fallback), and pre-empting it would resolve a package with
      // `"main": "index.js"` to JavaScript and hand it to the CSS parser. Only
      // when it gives up do we ask Node, which does understand `exports`. If
      // that fails too, rethrow the original so the error keeps postcss's
      // "Failed to find … in [paths]" context.
      async resolve(id, basedir, importOptions, atRule) {
        // `resolveCssId` unshifts `basedir` onto the shared `importOptions.path`
        // on its way out of a failure. That was inert while the failure was
        // fatal; now that it is caught, the mutation would leak into every
        // later @import and quietly widen the search path — enough for a
        // typo'd import to start resolving to some unrelated stylesheet.
        const searchPath = [...importOptions.path];
        try {
          return await resolveCssId(id, basedir, importOptions, atRule);
        } catch (error) {
          importOptions.path.splice(
            0,
            importOptions.path.length,
            ...searchPath,
          );
          let resolved;
          try {
            resolved = nodeRequire.resolve(id, { paths: [basedir] });
          } catch {
            throw error;
          }
          // Node resolves a package with no CSS entry to its JavaScript one.
          // Handing that to the CSS parser produces "Unknown word 'use strict'"
          // pointing into node_modules; postcss's own "Failed to find" is the
          // more useful error.
          if (!resolved.endsWith(".css")) throw error;
          return resolved;
        }
      },
    },
    "@stylexjs/postcss-plugin": {
      include: [
        "src/**/*.{js,jsx,ts,tsx}",
        "../../packages/ui/src/**/*.{js,jsx,ts,tsx}",
      ],
      useCSSLayers: true,
      babelConfig: {
        configFile: path.resolve(__dirname, "babel.config.js"),
      },
    },

    "postcss-flexbugs-fixes": {},
    "postcss-preset-env": {
      autoprefixer: {
        flexbox: "no-2009",
      },
      stage: 3,
      features: {
        "custom-properties": false,
      },
    },
  },
};
