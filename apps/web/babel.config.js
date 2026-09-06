const path = require("node:path");
const { stylexPluginOptions } = require("@tuja/babel-plugins/stylex-options");

const workspaceRoot = path.resolve(__dirname, "../..");
const uiPackageRoot = path.resolve(__dirname, "../../packages/ui");

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
          // Preserve ESM modules for test environment to work with Vitest
          modules: process.env.NODE_ENV === "test" ? false : "auto",
        },
      },
    ],
  ],
  plugins: [
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
      stylexPluginOptions({
        rootDir: workspaceRoot,
        nodeEnv: process.env.NODE_ENV,
      }),
    ],
  ].filter(Boolean),
};
