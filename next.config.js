const stylexPlugin = require("@stylexjs/nextjs-plugin");
const serwistPlugin = require("@serwist/next").default;

const withStylex = stylexPlugin({
  rootDir: __dirname,
  useCSSLayers: true,
});

const withSerwist = serwistPlugin({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
});

/** @type {import('next').NextConfig} */
const nextConfig = {};

module.exports = withSerwist(withStylex(nextConfig));
