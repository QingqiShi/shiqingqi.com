const path = require("node:path");

module.exports = {
  plugins: {
    "postcss-import": {},
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
