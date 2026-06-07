const path = require("node:path");

module.exports = async () => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    reactCompiler: true,
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
