const { stylexExtractionPlugins } = require("./babel-plugins.mjs");

module.exports = {
  plugins: {
    "postcss-import": {},
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
