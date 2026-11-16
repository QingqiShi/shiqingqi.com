const path = require("node:path");
const { reactCompilerOptions } = require("@tuja/babel-plugins/react-compiler");
const { PHASE_DEVELOPMENT_SERVER } = require("next/constants");

module.exports = async (phase) => {
  const allowedDevOrigins =
    phase === PHASE_DEVELOPMENT_SERVER
      ? await (
          await import("../../scripts/get-local-dev-origins.mjs")
        ).getLocalDevOrigins()
      : [];
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    allowedDevOrigins,
    reactCompiler: { ...reactCompilerOptions },
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
      // Turbopack panics when it restores its dev cache after a source file
      // is replaced under a running dev server.
      turbopackFileSystemCacheForDev: false,
      // The build cache cannot see how the StyleX Babel plugin resolves
      // `.stylex` imports across packages. It can restore a module with old
      // var hashes, which breaks the styles in production (#2761).
      turbopackFileSystemCacheForBuild: false,
      // Keep `light-dark()` native, so that a `color-scheme` on a subtree
      // changes the colour tokens in it (see apps/web/next.config.js).
      lightningCssFeatures: { exclude: ["light-dark"] },
    },
    transpilePackages: [
      "@tuja/i18n",
      "@tuja/next-links",
      "@tuja/pwa-runtime-caching",
      "@tuja/ui",
    ],
    // The app lives in a pnpm workspace; trace from the repo root so Next
    // bundles workspace dependencies correctly for serverless output.
    outputFileTracingRoot: path.resolve(__dirname, "../.."),
    async headers() {
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
          source: "/fonts/haffer-1/:file*",
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
