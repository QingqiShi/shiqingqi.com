const path = require("node:path");
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
      ];
    },
  };

  return nextConfig;
};
