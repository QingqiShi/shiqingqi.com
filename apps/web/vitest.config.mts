import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [
    babel({
      include: /src\/.*\.(tsx?|jsx?)$/,
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
      plugins: [
        "@tuja/i18n-babel-plugin",
        [
          "module-resolver",
          {
            alias: {
              "#src": "./src",
            },
          },
        ],
        "@tuja/babel-plugin-stylex-css-prop",
        [
          "@tuja/babel-plugin-stylex-breakpoints",
          {
            rootDir: __dirname,
          },
        ],
        [
          "@stylexjs/babel-plugin",
          {
            dev: false,
            test: true,
            runtimeInjection: false,
            genConditionalClasses: true,
            treeshakeCompensation: true,
            styleResolution: "property-specificity",
            enableMediaQueryOrder: true,
            unstable_moduleResolution: {
              type: "commonJS",
              rootDir: __dirname,
            },
          },
        ],
      ],
    }),
    react({
      jsxRuntime: "automatic",
    }),
  ],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test-setup.ts"],
    include: ["src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}"],
    exclude: [
      "src/ai-chat/eval/**/*.eval.ts",
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
      "server-only": path.resolve(__dirname, "./src/test-stubs/server-only.ts"),
    },
  },
});
