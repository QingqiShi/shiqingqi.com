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
  };

  return nextConfig;
};
