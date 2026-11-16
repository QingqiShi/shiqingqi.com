const { stylexExtractionPlugins } = require("./babel-plugins.mjs");

module.exports = {
  plugins: {
    "@tailwindcss/postcss": {},
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
  },
};
