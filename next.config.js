module.exports = async () => {
  /** @type {import('next').NextConfig} */
  const nextConfig = {
    reactStrictMode: true,
    reactCompiler: true,
    serverExternalPackages: ["esbuild-wasm"],
  };

  return nextConfig;
};
