const { createRequire } = require("node:module");
const { stylexExtractionPlugins } = require("./babel-plugins.mjs");

const nodeRequire = createRequire(__filename);

module.exports = {
  plugins: {
    "postcss-import": {
      // postcss-import does not read the `exports` map of a package, and
      // `@tuja/ui` maps its CSS to a file in `src`. Node's resolver reads the
      // map. For every other id, the default resolver applies.
      resolve: (id, basedir) =>
        id.startsWith("@tuja/")
          ? nodeRequire.resolve(id, { paths: [basedir] })
          : id,
    },
    "@stylexjs/postcss-plugin": {
      include: [
        "src/**/*.{js,jsx,ts,tsx}",
        "../../packages/ui/src/**/*.{js,jsx,ts,tsx}",
      ],
      useCSSLayers: true,
      // This pass needs only the StyleX metadata, so Babel does not generate
      // code. The full `babel.config.js` uses too much time and memory on the
      // Vercel build machine.
      babelConfig: {
        babelrc: false,
        configFile: false,
        code: false,
        parserOpts: { plugins: ["typescript", "jsx"] },
        plugins: stylexExtractionPlugins({ nodeEnv: process.env.NODE_ENV }),
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
