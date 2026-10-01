import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { babelPlugins } from "./babel-plugins.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    babel({
      include: /(?:apps\/web\/src|packages\/ui\/src)\/.*\.(tsx?|jsx?)$/,
      presets: [
        [
          "@babel/preset-env",
          {
            targets: { node: "current" },
            modules: false,
          },
        ],
        [
          "@babel/preset-react",
          {
            runtime: "automatic",
          },
        ],
        "@babel/preset-typescript",
      ],
      plugins: babelPlugins({ nodeEnv: "test" }),
    }),
    react({
      jsxRuntime: "automatic",
    }),
  ],
  test: {
    environment: "./src/testing/test-environment.ts",
    globals: true,
    setupFiles: ["./src/testing/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "src/**/*.eval.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
    ],
    coverage: {
      reporter: ["text", "json", "html"],
      exclude: [
        "node_modules/",
        "*.config.{js,ts}",
        "**/*.d.ts",
        "**/*.types.ts",
        "**/types.ts",
      ],
    },
  },
  resolve: {
    alias: {
      "#src": path.resolve(__dirname, "./src"),
      "server-only": path.resolve(__dirname, "./src/testing/test-stubs/server-only.ts"),
    },
  },
});
