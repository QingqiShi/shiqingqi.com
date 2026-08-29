const path = require("node:path");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

module.exports = async (phase) => {
  const allowedDevOrigins =
    phase === PHASE_DEVELOPMENT_SERVER
      ? await (
          await import("../../scripts/dev-origins.mjs")
        ).getLocalDevOrigins()
      : [];
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    allowedDevOrigins,
    // `src/proxy.ts` reads this to trust a same-host Referer in development.
    env: { ALLOWED_DEV_ORIGINS: allowedDevOrigins.join(",") },
    reactCompiler: true,
    // Type-checking runs as a dedicated CI job (build:tsc), so skip the
    // redundant in-build type-check pass to keep `next build` lean. (Linting
    // is enforced by the dedicated CI `lint` job; Next 16 no longer runs
    // ESLint during `next build`.)
    typescript: { ignoreBuildErrors: true },
    experimental: {
      // Next 16.3 defaults to the `typescript` package's CLI binary, but our
      // workspace aliases that package to `@typescript/typescript6`, which
      // ships the compiler API without a `tsc` binary. Use the API instead.
      useTypeScriptCli: false,
    },
    transpilePackages: ["@tuja/ui"],
    serverExternalPackages: ["esbuild-wasm", "@babel/parser", "prettier"],
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    turbopack: {
      rules: {
        "*.glsl": {
          loaders: ["raw-loader"],
          as: "*.js",
        },
      },
    },
    async redirects() {
      // https://nextjs.org/docs/app/api-reference/config/next-config-js/redirects
      // The /component-library route was renamed to /design-system. Keep
      // permanent redirects so existing bookmarks and shared links continue
      // to work for both the default (en, no prefix) and zh locales.
      return [
        {
          source: "/component-library",
          destination: "/design-system",
          permanent: true,
        },
        {
          source: "/zh/component-library",
          destination: "/zh/design-system",
          permanent: true,
        },
      ];
    },
    async headers() {
      // https://nextjs.org/docs/app/api-reference/config/next-config-js/headers#options
      const securityHeaders = [
        {
          key: "X-DNS-Prefetch-Control",
          value: "on",
        },
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
        {
          key: "X-Content-Type-Options",
          value: "nosniff",
        },
        {
          key: "X-Frame-Options",
          value: "DENY",
        },
        {
          key: "Content-Security-Policy",
          value: "frame-ancestors 'none'",
        },
        {
          key: "Referrer-Policy",
          value: "origin-when-cross-origin",
        },
        {
          key: "Permissions-Policy",
          value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
        },
      ];

      return [
        {
          source: "/(.*)",
          headers: securityHeaders,
        },
        {
          // Match hashed PWA icons: pwa-192x192.a1b2c3d4.png
          source: "/pwa-:size(\\d+x\\d+).:hash([a-f0-9]{8}).png",
          headers: [
            {
              key: "Cache-Control",
              value: "public, max-age=31536000, immutable",
            },
          ],
        },
      ];
    },
  };

  return nextConfig;
};
