const { DEV } = require("esm-env");
const { babelPlugins } = require("./babel-plugins.mjs");

module.exports = {
  presets: [
    [
      "next/babel",
      {
        "preset-react": {
          runtime: "automatic",
        },
        "preset-env": {
          // Required to make Server Actions work
          // Without it server actions compile to non-async functions which breaks the build.
          targets: { node: "current" },
        },
      },
    ],
  ],
  plugins: [
    // Turbopack does not inline `DEV` from `esm-env`. Without a literal, the
    // production bundle keeps the development-only code.
    ["@tuja/babel-plugins/inline-esm-env", { dev: DEV }],
    ...babelPlugins({ dev: DEV }),
  ],
};
