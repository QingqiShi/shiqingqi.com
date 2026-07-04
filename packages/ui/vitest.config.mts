import path from "node:path";
import { fileURLToPath } from "node:url";
import babel from "@rolldown/plugin-babel";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const workspaceRoot = path.resolve(__dirname, "../..");

export default defineConfig({
  plugins: [
    babel({
      include: /packages\/ui\/src\/.*\.tsx?$/,
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
              rootDir: workspaceRoot,
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
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
  },
});
