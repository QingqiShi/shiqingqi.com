module.exports = async () => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    reactCompiler: true,
    serverExternalPackages: ["esbuild-wasm"],
    turbopack: {
      rules: {
        "*.glsl": {
          loaders: ["raw-loader"],
          as: "*.js",
        },
      },
    },
    async headers() {
      return [
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
