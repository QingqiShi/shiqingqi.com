import path from "node:path";
import { fileURLToPath } from "node:url";
import { reactCompilerVitePlugins } from "@tuja/babel-plugins/react-compiler";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { babelPlugins } from "./babel-plugins.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const domTests = ["src/**/*.test.tsx", "src/**/*.dom.test.ts"];

export default defineConfig({
  plugins: [
    ...reactCompilerVitePlugins({
      include: /(?:apps\/assistant|packages\/(?:i18n|ui))\/src\/.*\.tsx?$/,
      babel: {
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
      },
    }),
    react({
      jsxRuntime: "automatic",
    }),
  ],
  test: {
    globals: true,
    // PGlite suites copy a migrated database in `beforeAll`; a loaded CI
    // runner can need far more than the 10 s default.
    testTimeout: 30_000,
    hookTimeout: 120_000,
    exclude: [
      "src/**/*.eval.ts",
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
    ],
    // Most tests do not use the DOM, and jsdom is slow to start. Thus only
    // `.test.tsx` and `.dom.test.ts` files get jsdom.
    projects: [
      {
        extends: true,
        test: {
          name: "dom",
          environment: "./src/testing/test-environment.ts",
          setupFiles: ["./src/testing/test-setup.ts"],
          include: domTests,
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["src/**/*.test.ts"],
          exclude: domTests,
        },
      },
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
      "server-only": path.resolve(
        __dirname,
        "./src/testing/test-stubs/server-only.ts",
      ),
    },
  },
});
