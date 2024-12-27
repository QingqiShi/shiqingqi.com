const stylexPlugin = require("@stylexjs/nextjs-plugin");

const withStylex = stylexPlugin({
  rootDir: __dirname,
  useCSSLayers: true,
  useRemForFontSize: true,
});

module.exports = async () => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    experimental: {
      reactCompiler: true,
    },
  };

  const withSerwist = (await import("@serwist/next")).default({
    swSrc: "src/sw.ts",
    swDest: "public/sw.js",
    disable: process.env.NODE_ENV === "development",
  });

  return withSerwist(withStylex(nextConfig));
};
