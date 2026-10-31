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
    // `src/proxy.ts` reads this to trust a same-host Referer in development.
    env: { ALLOWED_DEV_ORIGINS: allowedDevOrigins.join(",") },
    reactCompiler: { ...reactCompilerOptions },
    // The CI `tsc` job does the type check, so `next build` does not.
    typescript: { ignoreBuildErrors: true },
    experimental: {
      // The workspace aliases `typescript` to `@typescript/typescript6`,
      // which has the compiler API but no `tsc` binary.
      useTypeScriptCli: false,
      // Turbopack panics when it restores its dev cache after a source file
      // is replaced under a running dev server.
      turbopackFileSystemCacheForDev: false,
      // The build cache cannot see how the StyleX Babel plugin resolves
      // `.stylex` imports across packages. It can restore a module with old
      // var hashes, which breaks the styles in production (#2761).
      turbopackFileSystemCacheForBuild: false,
    },
    transpilePackages: ["@tuja/i18n", "@tuja/ui"],
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
